# ADR 0002 — One MongoDB database per service

**Status:** accepted

## Context
The services could share one database (simple joins, one connection string) or each own theirs. The project's goal is to demonstrate service boundaries that would survive a real split into separately deployed units.

## Decision
Every service connects to its own database (`eduelderly-auth`, `eduelderly-course`, …) on the same MongoDB instance. No service reads another service's collections. Cross-service data comes over HTTP via `/internal/*` routes and is shaped by shared DTOs.

## Consequences
- Boundaries are real: renaming a field in the course schema cannot break enrollment unless the DTO changes, and the DTO is in `packages/shared` where the change is visible.
- Enrollment stores only `courseId` and the learner's `completedTopics`; course facts (`title`, `categoryId`, `topicCount`, `estimatedHours`) are fetched from course `/internal/courses/:id/stats` when a list is read — once per distinct course, in parallel, and Redis-cached on the course side — and merged into the `EnrollmentDTO`. Enrichment at read time was chosen over snapshotting so a course edit shows up everywhere immediately.
- No cross-service transactions. Where consistency matters (paid enrol after webhook, certificate after completion) the calls are idempotent and re-checked on the next trigger rather than wrapped in a saga.
- Tests need a database per service; CI provides `TEST_MONGO_URI` per matrix job, and the notification suite further isolates one database per test file to keep a queue worker from racing another file's cleanup.
