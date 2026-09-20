# ADR 0004 — BullMQ for email and PDF side effects, inline fallback

**Status:** accepted

## Context
Sending email (Brevo) and rendering certificate PDFs are slow and can fail transiently. Doing them inside the request made registration and certificate issue slow and made retries the caller's problem.

## Decision
Two BullMQ queues on the existing Redis — `email` (notification service) and `certificate-pdf` (certificate service) — created through one shared helper (`packages/shared/queue`) that sets retries with exponential backoff and a `QUEUE_PREFIX` namespace. When `QUEUE_ENABLED` is not `true`, the same processor runs inline in the request, so tests and small deployments need no worker.

## Consequences
- Requests that used to wait on Brevo return 202 immediately; the worker retries before the notification is marked failed.
- Secret payloads (OTP, reset links) must not live in Redis or Mongo longer than needed: after delivery or final failure the notification's `templateData` is replaced by `{ redacted: true }` and the stored body is a placeholder.
- The prefix matters in shared environments: a live Docker worker once consumed jobs from a test run on the same Redis. Tests now use a per-run prefix.
- BullMQ requires a Redis connection with `maxRetriesPerRequest: null`; the shared helper owns that connection so services do not configure it individually.
