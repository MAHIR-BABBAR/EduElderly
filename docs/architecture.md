# EduElderly — architecture

This page explains how a request moves through the system, how services trust each other, and what happens asynchronously. The README already has the service map, ports and environment variables; this document is about the *why* and the *flow*. Decisions are recorded in [`docs/adr/`](./adr/).

## 1. Shape of the system

```
browser (React, Vite)  ──HTTPS──▶  gateway :8080
                                      │  JWT verify · rate-limit · CORS · route allow-list
                                      │  stamps X-Gateway-Key, X-User-Id, X-User-Role
                                      ▼
        ┌──────────┬──────────┬──────────┬────────────┬─────────┬──────────┬──────────────┬─────────┬──────────────┐
        │ auth     │ user     │ course   │ enrollment │ quiz    │ payment  │ notification │ admin   │ certificate  │
        │ :3001    │ :3002    │ :3003    │ :3004      │ :3005   │ :3006    │ :3007        │ :3008   │ :3009        │
        └──────────┴──────────┴──────────┴────────────┴─────────┴──────────┴──────────────┴─────────┴──────────────┘
              each service: Express 5 · own Mongo database · shared Redis (cache, rate-limit, BullMQ)
```

- **One monorepo, npm workspaces.** `packages/shared` holds the middleware, DTOs, error codes, cache and queue helpers every service imports; `packages/client` is the SPA; `services/*` are the ten Node services.
- **Every service owns its data.** Ten Mongo databases, no cross-service collection access. Services talk over HTTP through small typed clients (`services/<svc>/src/clients/*.js`).
- **The gateway is the only public door.** Nothing else is exposed in `docker-compose.prod.yml`.

## 2. Life of a request

`GET /api/v1/enrollments/me` with a learner's access token:

1. **Gateway** (`services/gateway/src/authValidation.js`)
   - Is the prefix known? (`routes.config.js`) — otherwise 404.
   - Is the endpoint an operator/internal path (`/internal`, `/docs`, `/metrics`, raw *or* percent-encoded)? — 404 before any token is looked at.
   - Is it on the service's public allow-list? — if not, verify the Bearer JWT (`HS256`, issuer `eduelderly`, audience `eduelderly-client`).
2. **Proxy** (`services/gateway/src/proxy.js`) strips any client-supplied `X-User-*` / `X-Service-Key`, then sets `X-Gateway-Key`, `X-User-Id`, `X-User-Role`, `X-Forwarded-For`, `X-Request-ID`.
3. **Service** (`packages/shared/middleware/requireGateway.js`) refuses the request unless `X-Gateway-Key` matches (timing-safe compare). Only then does `extractUser` trust the `X-User-*` headers. Controllers never read the JWT.
4. **Response** goes back through the proxy unchanged; DTOs in `packages/shared/dtos` decide what fields leave a service (for example `correctIndex` never appears in a quiz DTO).

## 3. The two-key trust model

| Header | Secret | Who sends it | Who checks it |
|---|---|---|---|
| `X-Gateway-Key` | `GATEWAY_KEY` | gateway, on every proxied user request | every service's `requireGateway` (skips `/internal`) |
| `X-Service-Key` | `INTERNAL_SERVICE_KEY` | a service calling another service's `/internal/*` | `serviceAuth` on every `/internal` router |

The keys are different on purpose: a request that carries the gateway key proves it came *through the gateway with a verified user*; a request that carries the service key proves it came *from a peer service*. Because the gateway never forwards the service key, a learner cannot reach `/internal/*` even though the gateway's own request is trusted. Production refuses to boot if the two keys are equal or missing (`packages/shared/utils/assertRequiredEnv.js`). `GATEWAY_TRUST_DISABLED` is honoured only outside production.

### Internal route map

| Service | `/internal/...` | Called by |
|---|---|---|
| user | `POST /profile`, `PATCH /sync`, `GET /:userId/profile`, `PATCH /:userId/xp` | auth (register/sync), enrollment (XP) |
| course | `GET /courses/:id`, `GET /courses/:id/stats`, `GET /topics/:id` | enrollment, payment |
| enrollment | `POST /enroll`, `GET /users/:u/courses/:c`, `POST /certificate-eligibility` | payment (paid enrol), quiz (gate + eligibility) |
| certificate | `POST /issue` | enrollment |
| notification | `POST /send` | auth, enrollment |
| payment | `POST /checkout` | enrollment |
| admin | `POST /audit-logs` | course, payment |
| all | `GET /stats` (`/queue/stats` where a queue exists) | admin dashboard |

## 4. Auth flow (auth service)

- **Register** → user document (auth DB) → `POST user/internal/profile` → verification email (via notification `/internal/send`, delivered by BullMQ).
- **Login** → password check → if 2FA is on, an OTP is emailed and the client receives a short-lived **OTP-pending token** (5 min, purpose-bound). The OTP verify call must present that token *and* the OTP, so the OTP step cannot be replayed against a different account and the resend endpoint cannot be used to spam an address (60 s cooldown, attempt counter in Redis).
- **Tokens**: access JWT 15 min (stateless, HS256), refresh JWT 7 days carrying a `jti`, stored server-side and sent as an `HttpOnly; SameSite=Strict` cookie scoped to `/api/v1/auth`. Refresh is a `findOneAndDelete` on the stored token hash — a token can be used exactly once even under concurrent requests; presenting an already-consumed token is treated as theft and every refresh token for that user is deleted (`services/auth/src/services/token.service.js`).
- **Password reset / email verification**: purpose-bound JWTs (1 h / 24 h) sent by email; the client posts the token in the body.

## 5. Learning flow (enrollment ↔ course ↔ quiz ↔ certificate)

```
enrol (free)  ─▶ enrollment.active ─▶ topic complete ×N ─▶ progress 100% ─▶ status COMPLETED
enrol (paid)  ─▶ payment /checkout ─▶ webhook (HMAC) ─▶ enrollment /internal/enroll ─┘
                                                                                    │
quiz submit ─▶ graded server-side ─▶ enrollment /internal/certificate-eligibility ◀──┘
                                        └─ completed AND every course quiz passed? ─▶ certificate /internal/issue
                                                                                          └─ PDF job (BullMQ) ─▶ stored, verify URL
```

- **Enrollment owns eligibility** (`certificateEligibility.service.js`): a certificate is issued only when the enrollment is `COMPLETED` *and* every published quiz for the course has a passing attempt. Both the "last topic completed" path and the "quiz passed" path call the same function, so the order in which a learner finishes does not matter.
- **Content is gated**: `GET /enrollments/:id/topics/:topicId/content` returns a topic's `contentUrl` only for an active/completed enrollment and only if the topic belongs to that course. The catalog never exposes `contentUrl`.
- **XP** is awarded through user `/internal/:userId/xp` for topic and course completion.
- **Lists are enriched, not denormalised**: `listEnrollmentsWithCourse` fetches course stats once per distinct course (parallel, Redis-cached by the course service) and merges them into the DTO.

## 6. Asynchronous work (BullMQ on Redis)

Two queues, both created through `packages/shared/queue/index.js` so retries, backoff and the `QUEUE_PREFIX` isolation are uniform:

| Queue | Producer | Worker | Job |
|---|---|---|---|
| `email` | notification `/internal/send` | notification service | send via Brevo; after success or final failure the payload's secret (OTP, reset link) is redacted from the stored notification |
| `certificate-pdf` | certificate `/internal/issue` | certificate service | render the PDF, store it, mark the certificate ready |

With `QUEUE_ENABLED=false` (default in tests and small deployments) the same code runs inline, so the behaviour is identical and the queue is an optimisation, not a dependency.

## 7. Caching

- Course catalog and per-course stats are cached in Redis under `eduelderly:course:*`; course/topic writes invalidate by prefix (`packages/shared/cache`).
- Rate-limit counters and OTP attempt counters live in Redis with TTLs.

## 8. Client

- React 18 + Vite, React Router, Zustand for auth state, React Query for server state, Radix primitives for accessible menus/dialogs/tabs.
- **Accessibility preferences are server-side** (`fontSizePref`, `highContrast` on the user profile) and mirrored to `localStorage` for guests, so a learner's text size follows them between devices. `AccessibilityContext` writes them as `data-*` attributes on `<html>`; `tokens.css` reacts.
- Design tokens live in `packages/client/src/styles/tokens.css`; the palette is WCAG AA-verified and `data-world` swaps a per-subject accent. Motion goes through `lib/motion.js`, which collapses to instant transitions under the OS `prefers-reduced-motion` setting.
- Course video is embedded from `youtube-nocookie.com` in a sandboxed iframe; any other `contentUrl` opens as an external link. URLs are classified client-side (`lib/utils.js#classifyContentUrl`) *and* validated server-side (`https://` only).

## 9. Verification

- **Per service**: Jest, run in-band (`npm test`) against real Mongo + Redis; a `security.test.js` in every service proves the gateway key is required and the internal key is rejected on user routes.
- **Gateway**: `internalBlock.test.js` covers raw and percent-encoded `/internal`, `/docs`, `/metrics` on every proxied prefix.
- **Client**: Vitest for `lib/*` and contexts; `npm run walk` (Playwright) logs in as learner and admin, visits 13 routes, asserts one `<h1>`, zero console/API errors and a clean axe WCAG A/AA scan at desktop and phone widths, also in high-contrast and huge-text modes.
- **Contracts**: every service serves `/docs` (Swagger UI) from an OpenAPI 3 document; `npm run docs:export` writes them to `docs/openapi/` and CI fails on drift.

## 10. Known limits

- Single `INTERNAL_SERVICE_KEY` shared by all services (per-service keys are a listed follow-up).
- No message broker: cross-service calls are synchronous HTTP with `.catch` fallbacks; a failed certificate issue is logged and retried on the next eligibility check, not queued.
- Mongo and Redis in the dev compose bind to all interfaces; the prod compose does not publish them.
- See the status header in [`NEXT-GEN-PLAN.md`](./NEXT-GEN-PLAN.md) for the exact list of open security items.
