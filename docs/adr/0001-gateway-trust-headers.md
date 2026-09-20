# ADR 0001 — Gateway trust headers instead of a service mesh

**Status:** accepted (revised 2026-09 to a two-key model)

## Context
Ten Express services sit behind one gateway. Each service needs to know *who* the caller is (user id, role) and *whether the request is trustworthy* (came through the gateway, or came from a peer service). Options were: verify the JWT in every service, run a service mesh with mTLS, or have the gateway verify once and pass identity on headers.

## Decision
The gateway verifies the JWT once and forwards identity as `X-User-Id` / `X-User-Role`. Trust is proven by shared-secret headers checked with a timing-safe compare:

- `X-Gateway-Key` (`GATEWAY_KEY`) on every proxied user request → checked by `requireGateway` on user routes.
- `X-Service-Key` (`INTERNAL_SERVICE_KEY`) on service-to-service calls → checked by `serviceAuth` on `/internal/*` routes.

The gateway strips any client-supplied `X-User-*` and `X-Service-Key` headers, never forwards the service key, and returns 404 for `/internal`, `/docs` and `/metrics` on proxied prefixes (raw or percent-encoded). Production refuses to start if the two keys are missing or equal.

## Why two keys
The first version used a single `INTERNAL_SERVICE_KEY` for both purposes. Because the gateway stamped it onto every proxied request, any learner with a valid JWT could call `POST /api/v1/enrollments/internal/enroll` and enrol themselves in paid courses, or hit `/internal/issue` on the certificate service. Splitting the keys makes "came through the gateway" and "came from a service" two different proofs; the gateway holds only the first.

## Consequences
- Services stay simple: no JWT library, no key rotation logic outside the gateway.
- Services must never be reachable except via the gateway or the private network — `docker-compose.prod.yml` publishes only the gateway port.
- A single shared `INTERNAL_SERVICE_KEY` means one leaked key exposes every service's internal API; per-service keys are a listed follow-up.
- Header-based identity is trivially spoofable *inside* the network. This is accepted for a Docker Compose deployment; a mesh with mTLS would replace the keys if the system ever ran on shared infrastructure.
