# ADR 0003 — Enrollment service owns certificate eligibility

**Status:** accepted

## Context
A certificate requires two facts from two services: the learner finished every topic (enrollment) and passed every quiz for the course (quiz). Someone has to combine them. Candidates: the certificate service (pull both), the client (ask for a certificate when it thinks it is due), or enrollment.

## Decision
Enrollment decides. `certificateEligibility.service.js` checks `status === COMPLETED` and asks quiz for the passing state of every published quiz, then calls certificate `/internal/issue`. It is triggered from both directions — when the last topic is completed and, via `POST /internal/certificate-eligibility`, when quiz grades a passing attempt — so finishing order does not matter. Certificate issue is idempotent on `(userId, courseId)`.

## Why not the client
Anything the client can request, an attacker can request. Eligibility must be computed from server-side state only; the client is told the outcome.

## Why not the certificate service
It would need to know about enrollments and quizzes, coupling it to two other domains. Keeping it a pure "issue and verify" service means it has one internal endpoint and one public verify route.

## Consequences
- Enrollment is the busiest service and calls user, course, quiz, certificate, payment and notification. That is acceptable: it is the learner's "state machine".
- A failed issue call is logged and retried on the next eligibility trigger, not queued. Under a sustained certificate outage a learner would see the certificate late, never wrong.
