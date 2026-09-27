# EduElderly — Next-Gen UI + Security Hardening Plan

> **Audience:** an AI model (or engineer) implementing this with no prior context.
> **Status (2026-09-20): implemented, with two partial security groups.** SEC-1…SEC-8 (SEC-1, the critical `/internal` hole, live-verified closed), F-1…F-8, B-1, B-2, S-1…S-9, V-1, V-2 and V-6 are done and committed on `feature/quiz-payment-demo`.
> **SEC-9 partial** — done: mock provider refused in prod, no webhook-secret fallback. Still open: Razorpay resolve by `payment.order_id` + amount/currency check; refund → un-enrol + revoke certificate; XP farming via drop/re-enrol; atomic `findOneAndUpdate` order transitions + stale-pending TTL; HMAC over the raw `Buffer`.
> **SEC-10 partial** — done: prod ignores `GATEWAY_TRUST_DISABLED`, password policy, course field whitelist, refresh-cookie path, `timeSpentMinutes` bounds, `HS256` pinned, `X-Service-Key` out of CORS, `Object.hasOwn` on `/health`, 100 KB auth bodies. Still open: single-use reset token; secret-strength check in `assertRequiredEnv`; `X-Request-ID` validation; gateway stripping `Cookie` for non-auth targets; dev-compose Mongo/Redis bound to `127.0.0.1`; per-service internal keys in prod compose. (`sanitizeFilter` was tried and reverted — it breaks server-built `$in`/`$ne` filters.)
> **Not done:** B-3 (`/users/me/summary` — the dashboard composes existing calls instead), V-5 (CI run not yet observed green; `CODECOV_TOKEN` still to add).
> **Supersedes:** Phase 3 of [`RESUME-READY-PLAN.md`](./RESUME-READY-PLAN.md). Phases 0–2 of that file are done. Phase 4 (E2E, README media, ADRs, deploy) still applies after this plan.
> **Before screenshots:** [`docs/screenshots/before/`](./screenshots/before/) — look at them first. They are the problem statement.

---

## 0. Rules for whoever implements this

Read this section fully. Every rule exists because it was violated or cost time once already.

### 0.1 Working agreement

1. **One task = one commit.** Task IDs (`SEC-3`, `F-2`, `S-1` …) go in the commit subject: `feat(client): S-1 dashboard redesign`. Never mix a security fix with UI work.
2. **Order is mandatory where a task lists `Depends on`.** Otherwise tasks inside one phase are parallelisable.
3. **Do the phases in order: SEC → F → B → S → V.** Security first: it is small, and a resume project with a known auth hole is worse than one with an ugly dashboard.
4. **Do not rebuild what exists.** §2 is the inventory. If you need a variant, extend the existing file.
5. **Never invent API fields.** Response shapes are committed in `docs/openapi/<service>.json`. If a screen needs data that does not exist, there is a `B-*` task for it; do that task first.
6. **Every backend change:** route + validator + service + Jest test + OpenAPI entry, then `npm run docs:export` and commit the regenerated `docs/openapi/*.json`. CI fails on drift.
7. **Every screen change:** all four states (loading / empty / error / populated), a Vitest test, and the walk script (§9) must pass.
8. **Report honestly.** If a test fails or a step was skipped, say so in the commit body. Do not mark a task done with a failing check.

### 0.2 Commands

| Purpose | Command (run from repo root unless noted) |
|---|---|
| Start backend | `docker compose up -d` (gateway on `http://localhost:8080`) |
| Seed demo data | `npm run demo:seed` |
| Start client | `npm run dev -w packages/client` → `http://localhost:5173` |
| Demo logins | `learner@demo.eduelderly` / `admin@demo.eduelderly`, password `Demo1234!` |
| Client tests | `npm test -w packages/client` |
| Service tests | `npm test -w services/<name>` (needs `docker compose up -d mongo redis`; Redis-dependent suites need `REDIS_URL=redis://127.0.0.1:6379`) |
| Lint | `npx eslint . -f json -o "$HOME/eslint-out.json"` — takes ~4 min; run it in the background and read the JSON, do not wait on stdout |
| OpenAPI | `npm run docs:validate` then `npm run docs:export` |
| Client build | `npm run build -w packages/client` |

### 0.3 Environment gotchas (Windows + Docker)

- ESLint is **v9 flat config** (`eslint.config.js`). Do not add `.eslintrc*`. R3F JSX props must be in the `react/no-unknown-property` ignore list there.
- Commit with `git -c core.safecrlf=false commit …` (CRLF warnings otherwise abort).
- Services run under nodemon with **polling** (`--legacy-watch`); a saved file reloads in ~1–2 s. If a change is not picked up: `docker compose restart <service>`.
- `packages/shared` is bind-mounted into every container at `/deps/shared`. A **new npm dependency in shared** requires rebuilding images: `docker compose build && docker compose up -d`.
- After Vite re-optimises dependencies (any new npm package in the client), already-open browser tabs go blank. Hard-reload (`Ctrl+Shift+R`). This is not an app bug.
- Express 5 + `express-validator`: `.notEmpty()` does **not** enforce type — an object passes. Always pair with `.isString()` / `.isUUID()` / `.isInt()` (see SEC tasks).
- On Git Bash, heredocs containing apostrophes fail. Write multi-line files with your file-writing tool or a script file, not an inline heredoc.

### 0.4 Hard design constraints (do not negotiate these away)

The product is for learners aged 60+. "Cool" must never cost legibility.

- Body text ≥ 18 px at the default setting; honour `html[data-font-size]` = `default|large|xl|huge` (16/18/20/24 px base). **Every screen must be checked at `huge`.** Use the named Tailwind sizes (`text-sm … text-display`), never `text-[…]` arbitrary values and never `px` font sizes.
- Contrast ≥ 4.5:1 for text, ≥ 3:1 for UI boundaries. The palette in §4.2 is pre-verified; do not introduce colours outside it.
- Touch targets ≥ 44 × 44 px. Primary actions ≥ 56 px tall.
- Every animation is gated by `prefersReducedMotion()` from `src/lib/motion.js`. Under reduced motion the UI is **complete and static** — no information may exist only in an animation.
- No auto-playing, looping, or parallax motion inside the signed-in app. No motion the user did not cause, except the single entrance of a screen.
- `html[data-high-contrast='true']` must keep working: gradients, photos-behind-text, and textures are removed and replaced by flat surfaces with 2 px black borders.
- One `h1` per route, set via `PageHeader` or `usePageTitle`. Focus moves to it on navigation (`RouteChange` already does this).
- WebGL/3D **only on the landing hero and the certificate showcase**. GSAP is installed but must not be used for anything framer-motion can do.

---

## 1. Diagnosis — why the current UI reads as "bad"

Evidence: `docs/screenshots/before/*.png`. The earlier pass built a design-system foundation (tokens, primitives, motion helpers) but **almost no screen consumes it**, and the one screen that was redesigned has a composition bug.

| # | Problem | Where you can see it | Root cause |
|---|---|---|---|
| D1 | **One visual idea, repeated everywhere.** White rounded rectangle on pale blue-grey, one teal, one button style. Dashboard, catalog, quiz and lesson are visually interchangeable. | every screenshot | No per-screen layout concept; no imagery; no colour system beyond teal + gold. |
| D2 | **Landing hero is broken.** The 3D lesson cards and certificate mesh sit *behind the headline and paragraph*; text collides with geometry. | `ui-landing.png` | Full-bleed `<Canvas>` under a text column with only a gradient scrim. No compositional separation. |
| D3 | **No imagery at all in the app.** Every seeded course has a real `thumbnailUrl` and a `CourseCover` component exists — neither is used on catalog or dashboard cards. | `ui-catalog.png`, `ui-dashboard.png` | Omission. Fixing this alone is a large share of the perceived quality. |
| D4 | **Bureaucratic copy instead of visual state.** "Status: active", "You have earned 0 experience points", "Pass threshold: 70%", "Enroll (paid)", "1 modules · 1 hours". | dashboard, quiz, course detail | Raw model fields rendered as sentences. No pluralisation. |
| D5 | **The display typeface is wasted.** Fraunces only ever appears at ~27 px in one weight. No large editorial moments, no italics, no optical sizing. | all | `index.html` loads only `wght 600;700`, roman. `font-optical-sizing` never set. |
| D6 | **Quiz = one long form.** Quiz picker and every question stacked on one scrolling page. | `ui-quiz.png` | No step model; `Stepper` exists but is unused. |
| D7 | **Lesson page has no sense of place.** A card, an iframe, a list. No progress context, no focus treatment, no next-lesson momentum. | `ui-learning.png` | — |
| D8 | **Demo data leaks implementation notes into the UI.** "A short paid course placeholder for testing enrollment and mock payment flows." | catalog, course detail | Seed copy written for developers. |
| D9 | **Flat depth.** One shadow, one radius, no layering, no texture, large empty areas of `#f7fafb`. | all | — |
| D10 | **Catalog filtering is client-side over one page of results.** Works with 6 courses, silently wrong with 60. | `CatalogPage.jsx` | `GET /courses` accepts only `page`/`limit`. |

**What "next-gen" means here.** Not more effects. It means: (a) each screen has **one memorable idea**; (b) real photography and a **colour world per subject**; (c) **editorial typography** at confident scale; (d) **spatial continuity** — things move from where they were to where they are going; (e) state is **shown, not described**.

---

## 2. What already exists — reuse, do not rebuild

All paths relative to `packages/client/src/`.

| Area | File | Exports / notes |
|---|---|---|
| Tokens | `styles/tokens.css` | CSS custom properties; `html[data-font-size]`, `html[data-high-contrast]` blocks. **F-1 changes the values and adds names; it does not rename existing ones.** |
| Tailwind | `../tailwind.config.js` | colours `brand-*`, named font sizes `text-xs…text-display`, `duration-fast/calm`, `max-w-content`, `bg-hero`, `shadow-card/lift`. |
| Motion | `lib/motion.js` | `prefersReducedMotion`, `fadeUp()`, `fadeIn()`, `listStagger(s)`, `pageTransition()`, `pressable()`, `heroReveal(delay)`, `heroStagger(s)`, `celebrate()`, `CELEBRATION_MS`, `inViewOnce`. All return framer-motion props and already degrade under reduced motion. |
| API | `lib/api.js` | `authApi, userApi, courseApi, enrollmentApi, quizApi, paymentApi, certificateApi, statsApi, adminApi, userAdminApi, courseAdminApi, categoryAdminApi, quizAdminApi, paymentAdminApi, ApiError`. Access token lives in memory; refresh is an httpOnly cookie. |
| State | `stores/authStore.js` | Zustand: `isAuthenticated, isLoading, profile, …`. Server data goes through React Query, not Zustand. |
| Primitives | `components/ui/` | `Button` (cva variants), `Card` (`interactive` prop), `Badge`, `Alert`, `Input`, `Label`, `FormField`, `Accordion`, `Dialog`, `Sheet` (`side`), `Tabs`, `Toast` (`ToastProvider`, `useToast`), `Skeleton` (+ `CourseCardSkeleton`, `StatTileSkeleton`, `LessonSkeleton`, `TextSkeleton`), `EmptyState`, `Breadcrumbs`, `Progress`, `ProgressRing({value,size,strokeWidth,label,showValue})`, `StatTile({label,value,icon,hint,tone,animate})`, `Stepper({steps,current,onStepClick,label})`, `DataTable`, `CourseCover({title,courseId,src,className,children})`. |
| Layout | `components/layout/` | `AppShell`, `AuthLayout` + `AuthCard({title,description})`, `AdminLayout`, `MobileTabBar`, `PageHeader({eyebrow,title,description,documentTitle,children})`, `SectionBand({variant})`, `RouteChange` + `usePageTitle(title)`, `ErrorBoundary`. |
| Landing | `components/landing/` | `Hero3D` (lazy, WebGL-guarded), `Hero3DScene`, `HeroFallback`, `WebGLErrorBoundary`, `LearningPreview`, `Testimonials` (accessible carousel — keep as is). |
| Legacy | `components/marketing/motion.jsx` | `GlowCard` etc. **Delete in S-2** once `CatalogPage` stops importing it. |
| Routes | `routes/AppRoutes.jsx` | `/`, `/courses`, `/courses/:courseId`, `/verify-certificate`, `/login`, `/register`, `/verify-otp`, `/forgot-password`, `/reset-password`, `/dashboard`, `/learn/:enrollmentId`, `/quiz/:courseId`, `/settings`, `/certificates`, `/admin/{users,courses,courses/:courseId,categories,quizzes,orders}`. |
| Tests | `test/motion.test.js`, `test/ui.test.jsx`, `e2e/smoke.spec.js` | Vitest + Testing Library; Playwright. 28 client tests pass today — keep them green. |
| Docs | `/DESIGN.md` | Design principles incl. the "Celebration exception". **F-4 amends it.** |

---

## 3. Security — Phase SEC (do first, before any UI)

Two independent read-only audits plus live probing produced these. **Verification status is explicit per item.** "Confirmed live" = reproduced against the running stack. "Read-verified" = confirmed by reading the exact code path but not exploited. "Reported only" = an agent flagged it and it should be re-read before fixing. Do not skip a fix because it is "only" read-verified; do not claim a fix without adding the stated test.

Where a task fixes several findings at once, they are grouped. Each `SEC-*` is one commit.

### SEC-1 — CRITICAL: block `/internal/*` (and `/docs`, `/metrics`) at the gateway
**Confirmed live.** With a normal learner JWT I called `GET /api/v1/payments/internal/stats` through the gateway and received `{"revenueTotal":9.99,...}`, and `GET /api/v1/courses/internal/topics/<id>` returned a paid course's `contentUrl`. Both audit agents found this independently and one verified `x-service-key: <real key>` arriving at the upstream.

**Why:** `services/gateway/src/proxy.js:64-66` (`onProxyReq`) stamps `X-Service-Key: getInternalServiceKey()` onto **every** proxied request. `authValidation.js` only checks that a JWT is valid; it never inspects the path segment. Every service mounts `app.use('/internal', serviceAuth, …)` and `serviceAuth` checks the *same* `INTERNAL_SERVICE_KEY`. So "arrived via the gateway with a user token" is indistinguishable from "is a trusted peer service."

**Impact (all with a free learner account):** free paid-course enrollment (`enrollments/internal/enroll`), paid content exfiltration (`courses/internal/topics/:id`), forged certificates (`certificates/internal/issue`), phishing email from the real sender (`notifications/internal/send`), profile tampering and PII read (`users/internal/sync`, `users/internal/:id/profile`), arbitrary XP (`users/internal/:id/xp`), revenue disclosure (`payments/internal/stats`), audit-log forgery (`admin/internal/audit-logs`), and IDOR reads of other users' orders/eligibility.

**Fix (defence in depth — do BOTH layers):**
1. **Gateway block (primary).** In `services/gateway/src/authValidation.js`, after the route is matched, compute the endpoint path (there is already `endpointPathFor`) and **return 404** when the first segment is `internal` or the path is `/docs`, `/docs/*`, `/metrics` on a *proxied service* prefix. Decode once and also reject encoded forms (`%2e%2e`, `%2f`, mixed case) — normalise with `decodeURIComponent` in a try/catch, reject on failure. Do this for every method.
2. **Split the secrets (structural).** Introduce `GATEWAY_KEY`. The gateway sends `X-Gateway-Key: GATEWAY_KEY` (not the internal key). `requireGateway` checks `GATEWAY_KEY`; `serviceAuth` keeps checking `INTERNAL_SERVICE_KEY`; the gateway is never given `INTERNAL_SERVICE_KEY`. Now even if the gateway block regresses, a user request cannot satisfy `serviceAuth`. Update `packages/shared/middleware/{requireGateway,serviceAuth}.js`, all service `index.js` env wiring, `.env.example` files, `docker-compose*.yml`, and `assertRequiredEnv` lists.
**Tests:**
- Gateway (`services/gateway/src/__tests__/routing.test.js`): `GET /api/v1/courses/internal/topics/x`, `POST /api/v1/enrollments/internal/enroll`, `/api/v1/courses/docs`, `/api/v1/%69nternal/...`, and `/api/v1/admin/metrics` each → 404, with a valid learner token.
- One service test (e.g. user) asserting the internal router rejects a request bearing only the gateway key.
**Depends on:** nothing. **This is the release blocker.**

### SEC-2 — HIGH: path traversal in internal service-client URLs (survives SEC-1)
**Read-verified.** `services/enrollment/src/clients/courseClient.js:44-56` interpolates IDs into the internal URL unencoded, and `enrollmentValidators.js:30` validates `topicId` with `notEmpty()` only. The Node `new URL` normalisation was confirmed by the agent.

**Exploit:** `PATCH /api/v1/enrollments/<myEnrollmentId>/progress` with `{"topicId":"a/../../courses/<myCourseId>/stats"}`. `fetch` normalises to `/internal/courses/<cid>/stats`; the response `courseId` equals the enrollment's `courseId`, so the ownership check at `progress.service.js:29-31` passes; the raw fake string is added to `completedTopics` via `$addToSet`, granting +10 XP. Distinct prefixes/query strings mint unlimited fake topic IDs; once the count reaches `topicCount`, the course flips to COMPLETED (+100 XP) and — for a course with no published quiz — a certificate issues.

**Note on current mitigations found while verifying:** progress % is computed from `completedTopics.length / topicCount` (`progress.service.js:35-39`), and the course/topic match is checked — but neither defends against fabricated IDs, because the fake string still lands in `completedTopics`. So the fix must constrain the *set membership*, not just recount.

**Fix:**
1. Validate every ID: `body('topicId').isUUID()`, `body('courseId').isUUID()`, and each `param` ID `.isUUID()` across enrollment/quiz/payment validators.
2. `encodeURIComponent(id)` in every interpolated client URL: `enrollment/src/clients/{courseClient,userClient,quizClient}.js`, `quiz/src/clients/enrollmentClient.js`, `payment/src/clients/courseClient.js`.
3. In `markTopicComplete`, after fetching stats assert `stats.topicIds.includes(topicId)` (the course must actually contain that topic) before the `$addToSet`. Compute progress as `|completedTopics ∩ stats.topicIds| / topicCount`.
**Tests:** enrollment service — a traversal `topicId` → 400; a well-formed but foreign `topicId` → 400; a valid topic → progress advances by exactly one. Add `encodeURIComponent` unit assertions on the clients.

### SEC-3 — HIGH: OTP endpoints are a password-less login
**Read-verified.** `services/auth/src/services/session.service.js` `resendLoginOtp`/`verifyLoginOtp` never check `is2FAEnabled`, a prior password step, `lockedUntil`, `isVerified`, or `isActive`; `lastSent` is stored but never read (no resend cooldown), and resend resets the attempt counter.

**Exploit:** `POST /resend-otp {email,type:"login"}` then brute `POST /verify-otp` (3 tries per resend, counter resets each resend) — no password, no lockout. Also lets a suspended/locked user back in, and email-bombs the victim.

**Fix:** `/login` issues a short-lived signed `otp-pending` token (purpose claim, ~5 min) that `/verify-otp` and `/resend-otp` require; check `isActive/isVerified/lockedUntil/is2FAEnabled` in all three functions; enforce a 60 s cooldown via `lastSent`; keep a per-user failure counter that survives resends and feeds `recordFailedLogin`; make the Redis attempt counter atomic (`HINCRBY`).
**Tests:** verify-otp without a pending token → 401; cooldown blocks a 2nd resend within 60 s; failure counter is not reset by resend; inactive user cannot complete OTP.

### SEC-4 — HIGH: refresh-token hash collisions within one second
**Read-verified** (agent reproduced identical `tokenHash` for two same-second calls). `jwtHelper.js:31-34` builds the refresh payload as `{userId,iat,exp}` with no `jti`, so two logins/refreshes in the same second collide on the unique index and surface as a bogus 409 `E_EMAIL_TAKEN`. Also `token.service.js:53-61` does `findOne`+`deleteOne` non-atomically (token-family fork).
**Fix:** add `jti: crypto.randomUUID()` to the refresh payload; use `findOneAndDelete({tokenHash,userId})` and treat a null result as reuse (revoke family).
**Tests:** two refreshes issued back-to-back both succeed with distinct hashes; a replayed refresh triggers reuse-revocation.

### SEC-5 — HIGH: spoofable client IP / shared-bucket rate-limit DoS
**Read-verified** (agent confirmed `X-Forwarded-For: 6.6.6.6` reached the upstream unchanged). Auth sets `trust proxy = true` and disables the limiter's validation; the gateway sets no `trust proxy` and does not set/strip `X-Forwarded-For`.
**Fix:** gateway `app.set('trust proxy', <hop count>)`; in `onProxyReq` `proxyReq.setHeader('X-Forwarded-For', req.ip)`; auth `trust proxy = 1`, remove the `validate` override.
**Tests:** gateway forwards `X-Forwarded-For = req.ip`; a client-sent XFF is overwritten.

### SEC-6 — HIGH/MEDIUM: contentUrl / thumbnailUrl → stored XSS + unsandboxed iframe
**Read-verified.** `course/src/validators/courseValidators.js` validates these with `isString()` only; client `LearningPage.jsx:169,184` renders `contentUrl` as an iframe `src` and an `<a href>` with no sandbox, and `lib/utils.js` `toEmbedUrl` passes non-YouTube URLs through and matches `hostname.includes('youtube.com')` (so `youtube.com.evil.tld` passes). React 18.3.1 does not block `javascript:` hrefs.
**Exploit:** an admin (or anyone who reaches course-write via SEC-1) sets `contentUrl: "javascript:…exfiltrate accessToken…"`; the iframe runs in-origin.
**Fix:** server — `.isURL({protocols:['https'],require_protocol:true}).isLength({max:2048})` on `contentUrl`/`thumbnailUrl`. Client — render an iframe only when `hostname === 'www.youtube.com' || hostname.endsWith('.youtube.com')`; add `sandbox="allow-scripts allow-same-origin allow-presentation"` and `referrerPolicy="no-referrer"`; `encodeURIComponent` the video id; otherwise show a plain external link with a warning. Add a `frame-src` CSP on the static host.
**Tests:** validator rejects `javascript:`/`data:`/`http:`; `toEmbedUrl` unit tests for the evil-host and non-YouTube cases; component test asserts the `sandbox` attribute is present.

### SEC-7 — MEDIUM: NoSQL operator injection via `email` in auth
**Read-verified** (agent kept `{"email":{"$regex":"^a"}}` through the cast). The auth service has no input validation and `sanitizeFilter` is off, enabling character-by-character email enumeration and lockout-burning on the first document.
**Fix:** `mongoose.set('sanitizeFilter', true)` in auth; add `body('email').isEmail().normalizeEmail()` + `body('password').isString()` validators to `/login`, `/register`, `/forgot-password`, `/reset-password`, `/resend-verification`, `/verify-otp`, `/resend-otp`.
**Tests:** an object `email` → 400; a `$regex` email → 400.

### SEC-8 — MEDIUM: OTP / reset link stored in plaintext in the in-app feed
**Read-verified.** `notification.service.js:24-35` persists `body`/`payload.templateData` (the OTP or reset link); auth passes `userId`+`email` so channel becomes `both`; `NotificationDTO` returns `body`. A stolen 15-min access token → read `/notifications/me` → reset the password (skips the current-password check).
**Fix:** send `otp`, `email_verification`, `password_reset` on the **email channel only**; never persist `templateData`/`body` for these types (redact after send).
**Tests:** a reset notification is not returned by `GET /notifications/me`; its stored doc has no link/body.

### SEC-9 — MEDIUM: mock payment provider usable in production; XP/refund/atomicity issues
Group of related payment/enrollment integrity fixes (all read-verified):
- **Mock in prod:** `providers/index.js` has no prod guard and `MockProvider` falls back to `'mock-webhook-secret'`. Throw in `getProvider` when `name==='mock' && NODE_ENV==='production'` unless `ALLOW_MOCK_PAYMENTS=true`; remove the secret fallback.
- **Razorpay note-spoofing (if that provider is enabled):** resolve the tx by `payment.order_id → providerOrderId` only (not `notes.orderId`), and require `payment.amount === Math.round(tx.amount*100)` and `payment.currency === tx.currency`.
- **XP farming via drop/re-enroll:** reactivate the dropped enrollment record instead of creating a fresh one, or key XP on `(userId,topicId)`/`(userId,courseId)` idempotently.
- **Refund leaves access:** the REFUNDED branch must call an internal un-enroll (match by `paymentRef`) and revoke the certificate.
- **Non-atomic order transitions:** `findOneAndUpdate({orderId,status:PENDING},…)`; add a cancel/TTL for stale pending orders (they currently block re-checkout via `unique_pending_checkout`).
- **HMAC over re-decoded body:** `payment/src/index.js:21` signs `buf.toString('utf8')`; sign the raw `Buffer`.
**Tests:** one per bullet in the payment/enrollment suites.

### SEC-10 — MEDIUM/LOW: config & validation hardening (one commit)
- Ignore `GATEWAY_TRUST_DISABLED` when `NODE_ENV=production`; make `assertRequiredEnv` reject known default secrets and secrets < 32 chars.
- `mongoose.set('sanitizeFilter', true)` in every service; add `.isString().isUUID()` to all remaining `notEmpty()` ID validators.
- Password policy: 8–72 char string on register/reset/change.
- Single-use password-reset token (hashed `jti` in Redis, deleted on use) bound to `passwordChangedAt`.
- Whitelist course create/update fields (block `isPublished`/`isDeleted`/`courseId` mass-assignment).
- Refresh cookie `path:'/api/v1/auth'`; gateway strips `Cookie` for non-auth targets.
- Bound & type `timeSpentMinutes` `.isInt({min:0,max:600}).toInt()`.
- Build the catalog cache key from `safePage`/`safeLimit` (not raw query).
- Validate client `X-Request-ID` against `/^[\w-]{1,64}$/`; drop auth body limit to 100 KB; pin `algorithms:['HS256']` on every `jwt.verify`; remove `X-Service-Key` from CORS `allowedHeaders`; fix `/health/__proto__` 503 leak with `Object.hasOwn`.
- Bind dev-compose Mongo/Redis to `127.0.0.1`; give each service its own internal key in prod compose; remove the committed `MOCK_WEBHOOK_SECRET`.

### Already fixed / not a vulnerability (do NOT "fix" these)
- **Quiz duplicate-answer inflation (an agent's finding #3): ALREADY FIXED.** I read `services/quiz/src/services/attempt.service.js:25-44` in the current tree: it builds `submittedIds = new Set(...)`, requires `submittedIds.size === questions.length`, and asserts every question is answered exactly once **before** grading. Duplicates are rejected with 400. The agent read a stale version. Leave it; if you touch it, only add `body('answers').isArray({min:1,max:200})` and `.isInt().toInt()` on `selectedIndex` as belt-and-braces.
- **CSRF on `/refresh` & `/logout`:** the refresh cookie is `HttpOnly` + `Secure` (prod) + `SameSite=Strict` — covered.
- **Open redirect via `location.state.from`:** it comes from router state, not the URL — not exploitable.
- **`correctIndex` leakage:** absent from every DTO and admin response; unpublished quizzes 404; enrollment asserted on get/submit/list.
- **Content gate `GET /:courseId/modules`:** returns modules only, no `contentUrl`.
- **Certificate storage path traversal:** `certId` sanitised to `[a-zA-Z0-9-]`; UUIDv7 makes verify-enumeration impractical.
- **Ownership checks** on enrollment/order/certificate reads: all scoped by `userId`.

## 4. Design direction — "Sunroom"

**One sentence:** a warm, sunlit reading room — cream paper, deep ink-teal, confident editorial serif, real photographs tinted by subject — that feels like a premium wellness brand scaled up for 70-year-old eyes, not a SaaS admin template.

**Reference mood (for the implementer's mental model, do not copy assets):** Headspace / Calm for warmth and colour worlds; Apple Fitness summary for "state shown as rings, not sentences"; Kinfolk / NYT Cooking for editorial type over photography; Linear for crisp micro-interaction and bento composition.

### 4.1 The seven signature ideas

Each one is referenced by ID in the screen specs.

| ID | Idea | What it is | Why it is safe for older learners |
|---|---|---|---|
| **SIG-1 Paper & ink** | Surfaces are warm cream (`--color-surface #FAF6EF`), never blue-white. Raised cards are near-white with a hairline warm border and a two-layer soft shadow. A 3 %-opacity paper-grain texture sits on `body`. | Warm backgrounds reduce glare versus pure white; ink-on-cream is 14.8:1. Grain is removed in high-contrast mode. |
| **SIG-2 Subject worlds** | Every course belongs to a colour world derived from its category: `health` (sage), `digital` (indigo), `life` (terracotta), `money` (plum), `default` (teal). The world tints the course cover, its badges, its progress ring, the lesson header band and the quiz accent. | Colour becomes a wayfinding cue ("the green course"), always paired with a text label — never colour alone. |
| **SIG-3 Editorial type** | Fraunces at real display sizes with optical sizing, one *italic accent word* per headline in `--color-accent-ink`. Greeting on the dashboard at `text-hero`. DM Sans stays for all body and UI text. | Large type is the accessibility feature. The italic word is decorative emphasis only; it never carries meaning alone. |
| **SIG-4 Duotone covers** | `CourseCover` shows the course photo with the world gradient multiplied over it, so six unrelated Wikimedia photos look like one art-directed set. No photo → world gradient + oversized Fraunces initial + a quiet geometric pattern. | Text never sits on the photo without a solid scrim ≥ 60 % opacity; in high-contrast mode the photo is dropped entirely. |
| **SIG-5 Sky header** | The dashboard greeting band is a static gradient chosen by the learner's local hour (dawn / day / dusk / night) with a sun or moon disc. "Good morning, Margaret." It changes through the day; it never animates. | Orientation in time, zero motion. Text sits on a guaranteed-contrast scrim. |
| **SIG-6 Learning trail** | Lessons are drawn as a vertical trail: a line with nodes — done (filled + check), current (ring + "You are here" label), upcoming (hollow). Used in the lesson sidebar, the course syllabus and the dashboard "continue" card (horizontal, compact). | Replaces "3 of 12" arithmetic with a picture; each node is still a real link with a text name and `aria-current="step"`. |
| **SIG-7 Spatial continuity** | A course cover morphs from its catalog card into the course-detail hero (`layoutId`). Quiz questions slide horizontally like cards in a deck. Sheets rise from the control that opened them. | All ≤ 450 ms, user-initiated, and replaced by an instant swap under reduced motion. |

### 4.2 Palette (verified — WCAG ratios in brackets)

These are the **only** colours allowed. Ratios were computed against the surface they are used on.

| Token | Value | Use | Ratio |
|---|---|---|---|
| `--color-surface` | `#FAF6EF` | page background (paper) | — |
| `--color-surface-raised` | `#FFFDF9` | cards, sheets, inputs | — |
| `--color-surface-sunken` | `#F1EADF` | wells, table headers, skeleton base | — |
| `--color-text` | `#15242B` | body ink | 14.78 on paper |
| `--color-text-muted` | `#4F5F66` | secondary text | 6.17 on paper · 5.56 on sunken |
| `--color-primary` | `#14505C` | primary buttons, links | 8.36 on paper · white on it 9.01 |
| `--color-primary-dark` | `#0C343D` | hover, headings on paper | white on it 13.34 |
| `--color-primary-soft` | `#E2EEF0` | selected / hover tint | — |
| `--color-night` (new) | `#0A2229` | hero band, lesson focus band, footer | paper on it 15.30 |
| `--color-on-night-muted` (new) | `#B9CBD0` | secondary text on night | 9.83 |
| `--color-accent` | `#E9A23B` | marigold: highlights, progress fill on night, CTA on night | ink on it 7.35 · on night 7.61 |
| `--color-accent-ink` (new; replaces role of `--color-accent-dark`) | `#8A5A0B` | accent-coloured **text** and focus ring on paper | 5.49 on paper |
| `--color-accent-soft` | `#FDF1DC` | accent tint surface | — |
| `--color-border` | `#E2D8C8` | hairlines (decorative only) | — |
| `--color-border-strong` | `#8C7F69` | input borders, dividers that carry meaning | 3.64 on paper |
| `--color-danger` / soft | `#A8261B` / `#FCEBE8` | errors | 6.59 |
| `--color-success` / soft | `#23634A` / `#E3F0E8` | success | 6.60 |
| `--color-warning` / soft | `#8A5A0B` / `#FDF1DC` | warnings (shares accent-ink) | 5.49 |
| Focus ring on paper | `3px solid #8A5A0B`, offset 2px | | 5.49 |
| Focus ring on night | `3px solid #FFD27A`, offset 2px | | 11.58 |

Keep `--color-accent-dark` as an alias of `--color-accent-ink` so existing classes do not break.

**Worlds** — each defines four variables, set by a `data-world` attribute on any ancestor:

| `data-world` | `--world` (solid; white text on it) | `--world-ink` (text on soft) | `--world-soft` (tint surface) | `--world-gradient` | Ratios: solid on paper / white on solid / ink on soft |
|---|---|---|---|---|---|
| `default` | `#14505C` | `#0C343D` | `#E2EEF0` | `135deg, #0C343D → #1F7A8C` | 8.36 / 9.01 / — |
| `health` | `#2F6B4F` | `#1F4A36` | `#E3F0E8` | `135deg, #1F4A36 → #4E9C78` | 5.84 / 6.29 / 8.56 |
| `digital` | `#2F4B8F` | `#22386B` | `#E6EBF7` | `135deg, #22386B → #5673BD` | 7.72 / 8.32 / 9.53 |
| `life` | `#A4482B` | `#7A3520` | `#FBE9E2` | `135deg, #7A3520 → #D0714F` | 5.51 / 5.93 / 7.57 |
| `money` | `#6B3A6E` | `#512B54` | `#F3E6F4` | `135deg, #512B54 → #9A5F9E` | 7.94 / 8.55 / 9.56 |

In `html[data-high-contrast='true']` every world collapses to: `--world: #000; --world-ink: #000; --world-soft: #fff; --world-gradient: none`.

### 4.3 Typography

| Token | Size (× base) | Face | Use |
|---|---|---|---|
| `text-hero` (**new**) | `clamp(2.4×, 5.2vw + 1×, 4×)` | Fraunces 600, `opsz` auto, tracking −0.025em, leading 1.05 | landing h1, dashboard greeting |
| `text-display` | 2.6× | Fraunces 600 | page h1 on marketing pages, course title on detail |
| `text-3xl` | 2× | Fraunces 600 | app page h1 |
| `text-2xl` | 1.5× | Fraunces 600 | section h2 |
| `text-xl` | 1.25× | DM Sans 600 | card titles, h3 |
| `text-lg` | 1.125× | DM Sans 400/500 | lead paragraphs |
| `text-base` | 1× | DM Sans 400, leading 1.65 | body |
| `text-sm` | 0.875× | DM Sans 500 | meta, badges (never below 14 px computed) |
| `text-xs` | 0.78× | DM Sans 600 uppercase, tracking 0.08em | eyebrows only, max 3 words |

Rules: Fraunces **only** for headings h1–h2, big numerals (stats, percentages, quiz score) and pull quotes. One italic accent word per h1 at most: `<em class="accent-word">welcoming</em>`. Line length 45–70 characters (`max-w-prose` or `max-w-[65ch]` is the single permitted arbitrary value). Numerals in stats use `font-variant-numeric: tabular-nums`.

### 4.4 Depth, shape, texture

- Radii: `--radius-sm 8px` (inputs, chips), `--radius-md 14px` (buttons, small cards), `--radius-lg 22px` (cards), `--radius-xl 32px` (hero panels, covers). Pills are `9999px`.
- Shadows (warm-tinted, two-layer):
  - `--shadow-card: 0 1px 2px rgba(60,42,20,.06), 0 8px 24px -8px rgba(60,42,20,.12)`
  - `--shadow-lift: 0 2px 4px rgba(60,42,20,.08), 0 20px 40px -12px rgba(60,42,20,.22)`
  - `--shadow-inset: inset 0 1px 0 rgba(255,255,255,.7)`
- Texture: `--texture-grain` = inline SVG data-URI (`feTurbulence baseFrequency=.8 numOctaves=2`, greyscale) applied as `body::before { position:fixed; inset:0; pointer-events:none; opacity:.03; z-index:0 }`. Removed in high-contrast mode and when `prefers-reduced-transparency`.
- Layout grid: `max-w-content` (76rem), 12 columns, 24 px gutter; section rhythm 96 px desktop / 56 px mobile. **Bento** compositions (mixed-size tiles in a CSS grid) replace uniform card grids on the dashboard and landing.
- Glass is allowed in exactly one place: the sticky app header (`backdrop-blur` + 85 % paper). Nowhere else.

### 4.5 Motion system (three tiers)

Amend `lib/motion.js`; keep all existing exports.

| Tier | Duration / easing | Where | New exports |
|---|---|---|---|
| **Calm** (existing) | ≤ 200 ms, `cubic-bezier(.25,.1,.25,1)` | hover, press, focus, toasts, tab switches, accordions | — |
| **Spatial** (**new**) | 320–450 ms, spring `{ stiffness: 260, damping: 30, mass: 0.9 }` | shared-element cover morph, quiz card deck, sheet rise, bento entrance | `spatialSpring`, `deckSlide(direction)`, `sharedLayout(id)`, `bentoStagger()` |
| **Celebration** (existing) | ≤ 1800 ms, once, user-caused | course completed, quiz passed, certificate earned | `celebrate()` |

Rules: Spatial motion is always the direct result of a tap or click. Nothing loops. Under reduced motion every Spatial helper returns `{ initial:false, animate:{}, transition:{duration:0} }` and `sharedLayout()` returns `{}` (no `layoutId`, so no morph). Add these cases to `test/motion.test.js`.

Micro-interactions (all Calm tier, all CSS where possible):
- **Button press:** `scale(.98)` + shadow collapse, 120 ms.
- **Card hover (pointer devices only, `@media (hover:hover)`):** lift 4 px, shadow-card → shadow-lift, cover image `scale(1.03)` inside its clipped frame, 200 ms.
- **Spotlight border (desktop only):** interactive cards track the pointer with a radial-gradient border highlight via two CSS variables `--mx/--my` set in one `pointermove` handler (`components/ui/spotlight.js`, rAF-throttled). Skipped on touch, reduced motion, and high contrast.
- **Ring fill:** `ProgressRing` stroke animates from 0 to value once on first in-view, 600 ms (Celebration-exception precedent; static under reduced motion).
- **Number tick:** `StatTile` already counts up; keep.

---

## 5. Foundation tasks (F) — do these before any screen

### F-1 Tokens v2
**Files:** `src/styles/tokens.css`, `tailwind.config.js`, `src/index.css`.
1. Replace colour values per §4.2. Add `--color-night`, `--color-on-night-muted`, `--color-accent-ink`; alias `--color-accent-dark: var(--color-accent-ink)`.
2. Add world blocks: `[data-world='health'] { --world:…; --world-ink:…; --world-soft:…; --world-gradient: linear-gradient(…) }` for all five; `:root` gets the `default` values so components work without an ancestor attribute. Add the high-contrast collapse.
3. Radii, shadows, texture per §4.4. Add `--font-size-hero`.
4. Tailwind: `colors.world = { DEFAULT:'var(--world)', ink:'var(--world-ink)', soft:'var(--world-soft)' }`, `backgroundImage.world = 'var(--world-gradient)'`, `colors.brand.night`, `colors.brand['accent-ink']`, `fontSize.hero`, `boxShadow` updates, `borderRadius` updates, `transitionDuration.spatial = '400ms'`.
5. `index.css`: `body { background: var(--color-surface) }`, grain pseudo-element, `h1,h2 { font-optical-sizing:auto }`, `.accent-word { font-style: italic; color: var(--color-accent-ink) }` (on night: `var(--color-accent)`), global `:focus-visible` ring, `.on-night` helper that swaps the ring colour and text colours.
6. **Keep** `--cover-1…5` for now, redefined as aliases of the world gradients (e.g. `--cover-1: var(--world-gradient)`), with a `/* removed in F-3 */` comment. `CourseCover` still consumes them until F-3 rewrites it, so deleting them here would break the build. F-3 removes them.
**Accept:** `npm run build -w packages/client` passes; grep finds no *new* hex colours in `src/**/*.jsx` (hexes are allowed only in `tokens.css` and the 3D scene files); existing 28 tests pass. (The `--cover-` grep-clean check moves to F-3's acceptance.)

### F-2 Fonts
**File:** `packages/client/index.html`. Change the Google Fonts URL to load `Fraunces:ital,opsz,wght@0,9..144,400..700;1,9..144,400..700` and keep DM Sans as is. Keep `display=swap` and the `preconnect` links. Add `<link rel="preload" as="style">` for the stylesheet.
**Accept:** italic Fraunces renders in `.accent-word`; Lighthouse shows no render-blocking-font regression > 100 ms.

### F-3 Worlds + CourseCover v2
**New file:** `src/lib/worlds.js`
```js
// Deterministic subject → colour world mapping. Never random: the same course
// must be the same colour on every screen and every visit.
const SLUG_RULES = [
  [/health|wellness|fitness|nutrition|medic|care/i, 'health'],
  [/digital|tech|computer|internet|phone|online|safety/i, 'digital'],
  [/life|learning|art|history|culture|society|hobby/i, 'life'],
  [/money|finance|bank|pension|legal|budget/i, 'money'],
];
export const WORLDS = ['default', 'health', 'digital', 'life', 'money'];
export function worldFor({ categorySlug, categoryName, categoryId } = {}) { /* rules first, else stable hash of categoryId over the 4 non-default worlds, else 'default' */ }
```
Courses carry only `categoryId`; add `src/hooks/useCategories.js` (React Query, key `['categories']`, `staleTime: 10 min`) returning a `Map(categoryId → category)` and a helper `useCourseWorld(course)`.

**Rewrite:** `src/components/ui/course-cover.jsx`
- Props: `{ title, courseId, src, world = 'default', ratio = '16/10', layoutId, priority = false, className, children }`.
- Structure: `div[data-world].relative.overflow-hidden.rounded-xl.bg-world` (the gradient is always painted first, so there is never a blank flash) → `img` (`loading={priority ? 'eager' : 'lazy'}`, `decoding="async"`, `alt=""` because the title is adjacent text, `onError` → hide the img and show the fallback) → duotone layer `div.absolute.inset-0.bg-world.mix-blend-multiply.opacity-70` → bottom scrim `linear-gradient(to top, rgba(10,34,41,.72), transparent 55%)` only when `children` are overlaid.
- Fallback art (no `src` or error): gradient + the title's first letter in Fraunces at 40 % of the box height, `opacity .25`, bottom-right, clipped; plus a 1 px concentric-arc SVG pattern at 12 % opacity.
- High contrast: no image, no gradient; white box, 2 px black border, the initial in black.
- If `layoutId` is given and motion is allowed, the root is a `motion.div` with `layoutId` and `transition={spatialSpring}`.
Finally, delete `--cover-1…5` from `tokens.css` now that nothing consumes them.
**Tests (`test/ui.test.jsx`):** renders fallback when `src` missing; swaps to fallback on img `error`; sets `data-world`; no `layoutId` under reduced motion.
**Accept:** grep finds no `--cover-` anywhere in `src/`; `npm run build` passes.

### F-4 Motion tier + DESIGN.md amendment
Implement §4.5 exports in `lib/motion.js` with tests. In `/DESIGN.md` add a section **"Spatial tier"** stating: allowed range 320–450 ms; only user-initiated; never looping; listed call-sites (cover morph, quiz deck, sheet, bento entrance); reduced-motion behaviour; and the rationale (continuity aids comprehension for users who lose context on hard cuts). Do **not** loosen the 200 ms rule for anything else.

### F-5 New primitives
Create each in `src/components/ui/`, each with a test in `test/ui.test.jsx`.

| Component | Props | Behaviour |
|---|---|---|
| `Bento` + `BentoTile` (`bento.jsx`) | `Bento({children, className})`; `BentoTile({span = 'sm'|'md'|'lg'|'wide'|'tall', tone = 'raised'|'night'|'world'|'accent', as, className})` | CSS grid: 1 col < 640, 6 cols ≥ 768, 12 cols ≥ 1024. Spans map to `col-span`/`row-span` pairs. Entrance uses `bentoStagger()`. |
| `Trail` (`trail.jsx`) | `{ items:[{id,title,meta,state:'done'|'current'|'upcoming'|'locked',href,onSelect}], orientation='vertical'|'horizontal', compact=false, label }` | `ol` with `aria-label`; node + connector drawn in SVG/CSS; current item gets `aria-current="step"` and a visible "You are here" tag; locked items are not links and carry `aria-disabled` + a lock icon + the text "Locked". Each row ≥ 56 px tall. |
| `Chip` / `FilterChip` (`chip.jsx`) | `FilterChip({pressed,onPressedChange,children,count})` | `button[aria-pressed]`, 44 px tall, world-aware when inside `[data-world]`. |
| `SegmentedControl` (`segmented.jsx`) | `{ value,onValueChange,options:[{value,label,icon}],label }` | Radix `ToggleGroup`-style radiogroup with a sliding thumb (Calm tier; thumb jumps under reduced motion). Used for text size and sort. |
| `AnswerTile` (`answer-tile.jsx`) | `{ letter,children,selected,state:'idle'|'correct'|'incorrect',onSelect,disabled }` | Large radio tile (min 72 px), letter badge, check/x icon **and** text label for result states (never colour alone). |
| `SkyBand` (`sky-band.jsx`) | `{ hour = new Date().getHours(), children }` | Picks `dawn 5–8`, `day 9–16`, `dusk 17–19`, `night 20–4`; static gradient + sun/moon disc (pure CSS); children on a guaranteed scrim. `data-daypart` attribute for tests. High contrast → flat `--color-night`. |
| `Meter` (`meter.jsx`) | `{ value,max,label,world }` | Thick 12 px rounded bar, `role="progressbar"` with `aria-valuetext` like "2 of 5 lessons". Replaces thin `Progress` on cards. |
| `Kbd`-free `SearchField` (`search-field.jsx`) | `{ value,onChange,placeholder,label,onClear }` | 56 px tall, leading icon, visible label (may be `sr-only` only on the catalog hero), clear button with name "Clear search". Debounce is the caller's job. |
| `Spotlight` (`spotlight.js`) | `useSpotlight(ref)` | Sets `--mx/--my`; no-ops on touch / reduced motion / high contrast. |

### F-6 Copy helpers
**New file:** `src/lib/format.js` — `plural(n, 'lesson')` → "1 lesson" / "3 lessons"; `hours(n)` → "About 1 hour" / "About 3 hours"; `price(amount, currency)` via `Intl.NumberFormat`; `relativeDay(date)` → "today", "yesterday", "3 days ago", "on 4 March"; `greeting(hour)` → "Good morning" etc. Unit-test every branch. **Ban** string concatenation of counts in JSX after this lands.

### F-7 AppShell v2
**File:** `components/layout/AppShell.jsx`, `MobileTabBar.jsx`.
- Header: sticky, 72 px, paper at 85 % + `backdrop-blur`, hairline bottom border appears only after 8 px of scroll. Logo left; nav centre-right as text links with an animated underline pill for the active route (`layoutId="nav-active"`, Calm tier); right: a **"Text size" quick control** (A− / A+ buttons, persisted through the same setting the Settings page uses), the avatar menu (initials in a world-neutral circle → Radix dropdown: Settings, My certificates, Sign out).
- Wrap routed content in framer-motion `LayoutGroup` so `layoutId` morphs work across routes.
- Mobile: bottom tab bar, 4 tabs (Home, Courses, Learning, Me), 64 px tall + safe-area inset, active tab = filled icon + label + pill. Labels always visible.
- Footer: night band, three columns, big "Need help?" line with the support email, the accessibility controls repeated.
**Accept:** keyboard order logo → nav → text size → avatar; skip-link still first; no layout shift when the border appears.

### F-8 Seed copy clean-up
**Files:** `scripts/reseed-databases.js` (and any seed JSON it reads). Rewrite every course `description` for a learner, not a developer — remove "placeholder", "testing", "mock", licence notes. Move attribution to a new optional `credits` string field if the Course model allows extra fields; otherwise put it in the last topic's text content. Keep `thumbnailUrl`s. Re-run `npm run demo:seed`. Fixes D8.

## 6. Backend tasks (B) — the UI needs these; build before the screen that uses them

Each is: route + validator + service + Jest test + OpenAPI entry + `npm run docs:export`.

### B-1 Server-side catalog search/filter/sort (fixes D10; needed by S-2)
`GET /api/v1/courses` currently accepts only `page`/`limit` (`course.service.js:40-44`, sort fixed `createdAt:-1`). Add optional query params, all validated:
- `search` — `.isString().trim().isLength({max:100})` → Mongo `$text` over title+description (add a text index; do **not** use `$regex` on user input).
- `categoryId` — `.isUUID()`.
- `difficulty` — `.isIn(['beginner','intermediate','advanced'])`.
- `isPaid` — `.isBoolean().toBoolean()`.
- `sort` — `.isIn(['newest','popular','a-z'])`, default `newest` (`popular` = `enrollmentCount` desc if that field exists, else fall back to newest).
Keep the 60 s cache but include the new params in the cache key (and honour SEC-10's `safePage/safeLimit` keying). Response shape unchanged (`{courses,pagination}`) plus each course keeps `categoryId` (client derives world).
**Test:** filter by category returns only that category; `search` hits the text index; bad `difficulty` → 400; pagination still clamps ≤100.

### B-2 Dashboard "continue learning" + activity (needed by S-1)
The dashboard should not do N+1 calls. Provide one of:
- **Preferred:** `GET /api/v1/enrollments?status=active&sort=recent&limit=3` returning enrollments already joined with the course snapshot (title, thumbnailUrl, categoryId) — the join already exists in the list response (`course` sub-object is present, confirmed in the live payload). Just add `status` and `sort=recent` (by `lastAccessedAt` desc) query support + validation.
- Ensure the item carries `nextTopicId` (the `resume` endpoint already computes it) or add `progressPercent`, `currentLessonId`, and a `lessonsDone`/`lessonsTotal` pair so the card can render SIG-6 without another round-trip.
**Test:** `status=active` filters correctly; `sort=recent` orders by `lastAccessedAt`; the course snapshot is present.

### B-3 Learner stats for the dashboard header (needed by S-1)
Dashboard shows real numbers, not "0 experience points". Expose (reuse `statsApi` pattern, authenticated): `coursesInProgress`, `coursesCompleted`, `certificatesEarned`, `totalXP` (from `UserProfile.totalXP`), and a `currentStreakDays` if cheaply derivable from `lastAccessedAt` history (else omit — do **not** invent it). Prefer computing these in the enrollment/user service and returning them from a single `GET /api/v1/users/me/summary`.
**Test:** summary reflects seeded demo progress (1 in-progress, 1 completed).

> If B-2/B-3 cannot be delivered in time, S-1 must degrade gracefully by composing existing calls (`enrollmentApi.list()`, `certificateApi.listMine()`, `userApi.getProfile()`), never by inventing fields. Note that in the commit.

---

## 7. Per-screen specs (S) — the redesign

**Order (by demo value): S-1 → S-2 → S-3 → S-4 → S-5 → S-6 → S-7 → S-8 → S-9.** Landing (S-6) is deliberately NOT first — most effort already went there; the collision fix is bounded. Each screen is one commit and must ship all four states + a test + pass the walk script (§9).

Every spec below uses this fixed template so it is skimmable and executable:
**Purpose · The one memorable thing · Wireframe (desktop + 400px) · Components & props · Data · States · Motion · A11y · Tests · Accept.**

### S-1 Dashboard — `pages/DashboardPage.jsx`
- **Purpose:** on landing here, a learner instantly sees where they left off and can resume in one tap.
- **One memorable thing:** the **SkyBand greeting** (SIG-5) with an editorial Fraunces greeting, over a **bento** (SIG-6 trail + stats + suggestion), each course tile in its subject world (SIG-2).
- **Wireframe — desktop:**
```
┌──────────────────────────────────────────────── SkyBand (dusk gradient, moon) ┐
│  Good evening,                                                                 │
│  Margaret.              <- text-hero Fraunces, "evening" is the accent word    │
│  You are 20% through Healthy Living.            [ Resume lesson → ] (56px)      │
└────────────────────────────────────────────────────────────────────────────────┘
  BENTO (12 cols)
  ┌── Continue (wide, world=health) ─────────────┐ ┌ Streak (sm) ┐ ┌ XP (sm) ┐
  │ cover | Healthy Living  ● Meter 2/5          │ │  ProgressRing│ │  1,240  │
  │        Trail(horizontal, compact)  Resume →  │ │  3 days      │ │  points │
  └──────────────────────────────────────────────┘ └─────────────┘ └─────────┘
  ┌ Certificates (md) ┐ ┌ Recommended next (md, world of that course) ──────────┐
  │ 1 earned  View →  │ │ CourseCover + title + "Start" (Spatial morph to detail)│
  └───────────────────┘ └───────────────────────────────────────────────────────┘
```
- **Wireframe — 400px:** SkyBand full-width (greeting wraps, button full-width) → Continue tile → 2-up Streak/XP → Certificates → Recommended. Single column.
- **Components:** `SkyBand`, `Bento`/`BentoTile`, `CourseCover` (`world`, `layoutId={\`cover-${courseId}\`}`), `Trail` (horizontal, compact), `Meter`, `ProgressRing`, `StatTile`, `Button` (Resume = primary 56px), `PageHeader` is replaced by SkyBand owning the `h1` (`usePageTitle('Dashboard')`).
- **Data:** `GET /users/me/summary` (B-3), active enrollments (B-2), `certificateApi.listMine()`. Course world via `useCourseWorld`. Copy via `lib/format.js` (`greeting`, `plural`, `relativeDay`).
- **States:** *loading* → SkyBand static + `StatTileSkeleton`×2 + one `CourseCardSkeleton`. *empty* (no enrollments) → SkyBand + `EmptyState` "You have not started a course yet" + primary "Browse courses" → `/courses`. *error* → SkyBand + `Alert` (danger) "We could not load your progress" + Retry. *populated* → as wireframe.
- **Motion:** `bentoStagger()` entrance (≤450ms, once). Resume button `pressable()`. Cover morph handled by `layoutId` when navigating to detail. All static under reduced motion.
- **A11y:** one `h1` (the greeting). SkyBand text on a scrim ≥ the ratios in §4.2. Trail nodes are links with `aria-current="step"`. Every stat has a visible text label (never a bare number).
- **Tests:** renders greeting by mocked hour; empty state when `enrollments=[]`; resume link points at `/learn/:id`; no `layoutId` under reduced motion.
- **Accept:** screenshots at 1366 & 400, at `data-font-size="huge"`, and with `prefers-reduced-motion` all legible and un-clipped; kills D1/D3/D4/D9 on this screen.

### S-2 Catalog — `pages/CatalogPage.jsx` (remove `components/marketing/motion.jsx` import; then delete that file)
- **Purpose:** browse and narrow the course list without the page feeling like a spreadsheet.
- **One memorable thing:** a **magazine grid of duotone covers** (SIG-4) where each card wears its subject world, plus a calm sticky filter rail.
- **Wireframe — desktop:**
```
  PageHeader eyebrow="Catalog"  h1 "Find your next course"
  ┌ SearchField (56px, full width) ───────────────┐  [ Sort ▾ SegmentedControl ]
  FilterChips:  [All] [Health] [Digital] [Life] [Money] [Free] [Paid]     (44px)
  GRID (3 col ≥1024, 2 ≥768, 1 <768)
  ┌ Card world=health ┐ ┌ Card world=digital ┐ ┌ Card world=life ┐
  │ CourseCover 16/10 │ │ CourseCover        │ │ CourseCover      │
  │ ● Health  Free    │ │ ● Digital  $9.99   │ │ ● Life   Free    │
  │ Title (text-xl)   │ │ Title              │ │ Title            │
  │ 5 lessons·~2 hrs  │ │ ...                │ │ ...              │
  │ [stretched link]  │ │                    │ │                  │
  └───────────────────┘ └────────────────────┘ └──────────────────┘
```
- **400px:** search full width; chips scroll horizontally in a `role="group"` with a visible label; one column of covers.
- **Components:** `SearchField` (debounce 300ms in the page), `FilterChip`, `SegmentedControl` (sort), `Card interactive`, `CourseCover` (`world`, `layoutId`), `Badge` (world tone for category, neutral for price), `Meter` not needed here, `EmptyState`.
- **Data:** `courseApi.list({search,categoryId,difficulty,isPaid,sort,page})` (B-1). Categories via `useCategories`. Price/lessons via `lib/format.js`. **Filtering/sort/search are server-driven now — remove the client-side array filtering.**
- **States:** *loading* → 6 `CourseCardSkeleton`. *empty* (filters match nothing) → `EmptyState` "No courses match those filters" + "Clear filters". *error* → `Alert` + Retry. *populated* → grid + a "Showing N of M" line + pagination or "Load more".
- **Motion:** card hover lift + cover `scale(1.03)` (pointer only). Cover morphs into S-3 via `layoutId`. Chips toggle in Calm tier.
- **A11y:** chips are `aria-pressed` toggle buttons; the active set is announced via an `aria-live="polite"` "Showing N courses" line; each card is one tab stop (stretched-link pattern, no nested interactive elements); covers have `alt=""` with the title as adjacent text.
- **Tests:** typing in search calls the API with `search`; toggling a chip sets `categoryId`; empty state renders + "Clear filters" resets; `GlowCard` import is gone.
- **Accept:** as §0.4 checklist; kills D1/D3/D8/D10 here.

### S-3 Course detail — `pages/CourseDetailPage.jsx`
- **Purpose:** decide to enrol; understand what the course covers.
- **One memorable thing:** a **world-tinted hero** where the cover that morphed in from the catalog (SIG-7) sits beside an editorial title, with the syllabus as a **Trail** (SIG-6).
- **Wireframe — desktop (two-column, sticky enrol card):**
```
  Breadcrumbs: Courses / Healthy Living
  ┌ HERO band data-world=health, bg-world-soft ───────────────────────────────┐
  │  CourseCover (layoutId, 32px radius, ~380px)  │  ● Health · Beginner        │
  │                                               │  Healthy *Living* (display) │
  │                                               │  lead paragraph (max-65ch)  │
  │                                               │  5 lessons · ~2 hours       │
  └───────────────────────────────────────────────┴─────────────────────────────┘
  ┌ What you will learn (Trail, vertical) ────────┐  ┌ Enrol card (sticky) ──────┐
  │  ● Module 1 — Getting started                 │  │  Free  /  $9.99           │
  │    │ Lesson 1 · Lesson 2                      │  │  [ Enrol / Continue ] 56px│
  │  ○ Module 2 — ...                             │  │  [ Back to catalog ]      │
  └───────────────────────────────────────────────┘  └───────────────────────────┘
```
- **400px:** hero stacks (cover then text); enrol card becomes a **bottom `Sheet`** triggered by a sticky bottom bar showing price + "Enrol"; syllabus trail full width.
- **Components:** `Breadcrumbs`, `CourseCover` (matching `layoutId`), `SectionBand`/`data-world`, `Trail` (vertical, syllabus; locked lessons for non-enrolled = `state:'locked'`), `Badge`, `Button`, `Sheet` (mobile enrol), `Alert` (paid → "You will be taken to secure checkout").
- **Data:** `courseApi.getById(courseId)` (public; returns modules), `enrollmentApi` to detect existing enrolment (if enrolled, CTA = "Continue" → `/learn/:enrollmentId`). Enrol flow unchanged (free → enroll then dashboard; paid → checkout).
- **States:** *loading* → hero skeleton + `TextSkeleton` + `LessonSkeleton`×3. *empty* → n/a (404 → `EmptyState` "Course not found" + back). *error* → `Alert` + Retry. *populated* → as wireframe. *enrolling* → button spinner + disabled.
- **Motion:** cover morph in (Spatial). Accordion/trail expand Calm. Enrol success → toast; if it completes a purchase later, `celebrate()` belongs on the learning/cert screen, not here.
- **A11y:** one `h1` (course title, `.accent-word` on one word). Sticky mobile bar does not obscure the last trail item (bottom padding). Locked lessons carry the text "Locked", not colour alone.
- **Tests:** renders modules as a trail; enrolled user sees "Continue"; unauth user enrolling is sent to `/login` with return state; paid course shows the checkout notice.
- **Accept:** as checklist; kills D4/D8 here; demonstrates SIG-7 continuity from S-2.

### S-4 Learning / lesson — `pages/LearningPage.jsx` (also applies SEC-6 iframe hardening)
- **Purpose:** focus on one lesson; always know what is next.
- **One memorable thing:** a **focus layout** — a dark `--color-night` header band framing the video, a persistent **Trail sidebar** (SIG-6) showing the whole course, and a big **"Next lesson"** momentum button.
- **Wireframe — desktop (content + rail):**
```
  ┌ FOCUS band data-world, bg-night ───────────────────────────────────────────┐
  │  Healthy Living · Module 1              Meter 2/5  ●●○○○   (on-night text)   │
  │  Lesson 2 — Getting Started with Gentle Exercise   (Fraunces, paper on night)│
  └──────────────────────────────────────────────────────────────────────────────┘
  ┌ video 16/9 (sandboxed iframe) ─────────────────┐  ┌ Trail (vertical, sticky) ┐
  │                                                │  │ ● L1 done                │
  │                                                │  │ ◉ L2 you are here        │
  │  [ Mark lesson complete ] (56px, primary)      │  │ ○ L3 ...                 │
  │  [ ← Prev ]                    [ Next lesson → ]│  │ ○ L4                     │
  └────────────────────────────────────────────────┘  └──────────────────────────┘
```
- **400px:** focus band → video → complete/next buttons → Trail collapses into a `Sheet` opened by a sticky "Lessons (2/5)" button.
- **Components:** `SectionBand` (`bg-night`), `Meter` (on-night variant), `Trail` (vertical sticky / mobile Sheet), `Button`, `Alert`. Video: hardened embed per SEC-6 (`www.youtube.com`/`*.youtube.com` allowlist, `sandbox`, `referrerPolicy`, encoded id); non-allowlisted `contentUrl` → an external-link card with a "Opens in a new tab" note, never an iframe.
- **Data:** `enrollmentApi.get(enrollmentId)`, `enrollmentApi.topicContent(...)`, `enrollmentApi.progress(enrollmentId, topicId)` to mark complete, `enrollmentApi.resume` for `nextTopicId`. Progress bump is the SEC-2-hardened path.
- **States:** *loading* → band skeleton + video skeleton + `LessonSkeleton` rail. *empty* → n/a. *error* → `Alert` + Retry. *complete-of-course* → `celebrate()` once + a "You finished the course" panel linking to the quiz or certificate.
- **Motion:** marking complete flips the Trail node (Calm). Course completion = Celebration tier (respect reduced motion → static success panel). No autoplay.
- **A11y:** iframe has a `title` (the lesson name). "You are here" is text + `aria-current="step"`. Focus moves to the lesson `h1` on lesson change. Controls ≥ 56px.
- **Tests:** a non-YouTube `contentUrl` renders a link, not an iframe; the iframe has `sandbox`; "Next lesson" navigates to `nextTopicId`; marking complete calls `progress` with the current topic.
- **Accept:** as checklist; kills D7; demonstrates SEC-6 in the UI.

### S-5 Quiz — `pages/QuizPage.jsx`
- **Purpose:** take the quiz one question at a time, then see a clear result.
- **One memorable thing:** a **question deck** — one question per screen on a `Stepper`, questions sliding like cards (SIG-7), and `AnswerTile`s big enough to tap; a celebratory but calm result.
- **Wireframe — desktop:**
```
  Stepper: ①──②──③──④──⑤     "Question 2 of 5"
  ┌ data-world card ───────────────────────────────────────────┐
  │  Which of these is a sign of dehydration?   (text-2xl)      │
  │  ┌ A  Dry mouth ────────────────┐  (AnswerTile ≥72px)       │
  │  ┌ B  ...                        ┐                           │
  │  ┌ C  ...                        ┐                           │
  │  ┌ D  ...                        ┐                           │
  │            [ ← Back ]         [ Next → ] (disabled until pick)│
  └─────────────────────────────────────────────────────────────┘
  RESULT screen: ProgressRing(score) big Fraunces %, pass/fail chip,
                 per-question review (correct/your answer w/ icon+text), Retry / Continue
```
- **400px:** identical, single column; Stepper compresses to "2 / 5" + a thin `Meter`.
- **Components:** `Stepper`, `AnswerTile`, `ProgressRing` (result), `Badge` (Passed/Not yet), `Button`, `Alert` (out of attempts), `deckSlide(direction)` for transitions.
- **Data:** `quizApi.getByCourse(courseId)` then `quizApi.getById`, `quizApi.submitAttempt(quizId, answers)`. Answers accumulate client-side; submit **exactly one answer per question** (matches the server guard verified in SEC "already fixed"). Never send duplicates.
- **States:** *loading* → Stepper skeleton + tile skeletons. *empty* (course has no quiz) → `EmptyState` "This course has no quiz" + back. *error* → `Alert`. *submitting* → disabled + spinner. *result* → as wireframe. *out of attempts* → `Alert` + review only.
- **Motion:** `deckSlide` between questions (Spatial; instant under reduced motion). Passing = `celebrate()` once. Answer selection = Calm.
- **A11y:** each question is a `fieldset`/`radiogroup` with a `legend`; `AnswerTile`s are radios; result states use icon **and** text ("Correct", "Your answer"), never colour alone; focus moves to the new question heading on step change; the Stepper communicates position to SR.
- **Tests:** Next disabled until an option is chosen; submitting sends one answer per question; result shows the score ring; reduced motion → no slide; passing triggers celebrate (mockable).
- **Accept:** as checklist; kills D6.

### S-6 Landing hero fix + polish — `pages/LandingPage.jsx`, `components/landing/*`
- **Purpose:** communicate the product in five seconds without the current text/geometry collision (D2).
- **One memorable thing:** a **split hero** — editorial copy in a left column that never overlaps the 3D scene, which is now constrained to the right.
- **Fix D2 precisely:**
```
  ┌ HERO (bg gradient-hero / night) ──────────────────────────────────────────┐
  │  LEFT 46% (z-10)                    │  RIGHT 54% (relative, clipped)        │
  │  eyebrow chip                       │   <Canvas> absolutely positioned      │
  │  h1 text-hero, "welcoming" accent   │   INSIDE this right box only          │
  │  lead (max-60ch)                    │   (camera offset so meshes sit right- │
  │  [ Start learning ] [ Browse ]      │    of-centre; NO mesh crosses 46%)    │
  │  StatTiles row                      │   HeroFallback / high-contrast: a      │
  │                                     │   static duotone image, no Canvas      │
  └─────────────────────────────────────┴────────────────────────────────────────┘
```
  - The `<Canvas>` lives in a `relative overflow-hidden` right-column box (≈54vw, `min-h`), **not** full-bleed under the text. On < 1024px the scene moves **below** the copy (or is replaced by `HeroFallback`), never behind it.
  - Text sits on the gradient with its own solid-enough treatment; no reliance on a scrim over geometry.
  - Reduced motion / no WebGL / high contrast → `HeroFallback` static image; hero copy unchanged.
- **Rest of page:** keep `LearningPreview`, promises, featured courses (now real `CourseCover`s with worlds + `layoutId` into S-3), steps, `StatTiles` from `statsApi`, `Testimonials` (keep), CTA band. Apply Sunroom tokens/type throughout.
- **Data:** `statsApi.get()`, `courseApi.list({limit:3,sort:'popular'})`.
- **States:** stats loading → `StatTileSkeleton`; featured loading → `CourseCardSkeleton`; stats error → hide the strip silently (marketing page, non-blocking).
- **Motion:** `heroStagger`/`heroReveal` entrance (existing). The 3D scene may idle-rotate slowly — **this is the one permitted ambient motion, and only on the marketing landing, gated by reduced motion and WebGL**. Featured covers morph into S-3.
- **A11y:** one `h1`; Canvas `aria-hidden`; all hero info exists in text; CTA buttons ≥ 56px.
- **Tests:** update `e2e/smoke.spec.js` heading assertion if copy changes; a test asserting no hero mesh element overlaps the text column is impractical — instead assert `HeroFallback` renders when WebGL is mocked off, and that the Canvas container has the right-column class.
- **Accept:** at 1366, 1024, 768, 400 and at `huge` the headline and paragraph are never overlapped by 3D; high-contrast shows the static hero.

### S-7 Certificates — `pages/CertificatesPage.jsx` + `CertificateVerifyPage.jsx`
- **Purpose:** show earned certificates as something worth screenshotting; let anyone verify one.
- **One memorable thing:** a **certificate showcase card** with a subtle gold foil treatment (the *second and only other* permitted WebGL/enhanced surface — but a CSS gradient-sheen is acceptable and preferred for perf), Download and Verify actions.
- **Wireframe:** grid of certificate cards (course title in Fraunces, learner name, date, `certId`, a gold-edged frame) → each has "Download PDF" + "Copy verify link". Empty → `EmptyState` "Finish a course to earn your first certificate" + Browse. Verify page: enter/scan an id → a big Verified/Not-found panel with the certificate details.
- **Components:** `Card` (foil variant via gradient + `--shadow-lift`), `Button`, `Badge`, `EmptyState`, `Alert`, `ProgressRing` not needed. `celebrate()` may fire once when arriving fresh from a completion (via route state), else static.
- **Data:** `certificateApi.listMine()`, download endpoint, `certificateApi.verify(id)` (public). Respect `pdfStatus` (show "Preparing your PDF…" when pending).
- **States:** loading / empty / error / populated as standard; PDF pending → disabled Download + note.
- **A11y:** one `h1`; the foil is decorative (`aria-hidden`); certificate details are real text; verify result uses text ("Verified") + icon.
- **Tests:** empty state; a certificate renders its id and a working verify link; pending `pdfStatus` disables download.
- **Accept:** standard checklist.

### S-8 Settings — `pages/SettingsPage.jsx`
- **Purpose:** change name, and the accessibility controls that define this product.
- **One memorable thing:** **live-preview accessibility controls** — text size (`SegmentedControl`: Default/Large/XL/Huge) and high-contrast (`Switch`) that update the whole app instantly and show a preview paragraph, so a learner sees the effect before committing.
- **Components:** `Tabs` (Profile / Accessibility / Account), `SegmentedControl`, Radix `Switch`, `FormField`, `Input`, `Button`, `Alert`. These write the same settings the AppShell quick-control and `html[data-*]` attributes read.
- **Data:** `userApi.getProfile()`/`updateProfile()`; font-size + contrast persist locally (and to profile `fontSizePref`/`highContrast` if present).
- **States:** loading skeleton; save success toast; save error `Alert`.
- **A11y:** controls are labelled; the preview updates `aria-live="polite"`; switching contrast does not lose focus.
- **Tests:** changing text size sets `html[data-font-size]`; contrast toggles `data-high-contrast`; profile save calls `updateProfile`.
- **Accept:** standard checklist; verify the whole app re-themes live.

### S-9 Admin shell + pages — `pages/admin/*`, `components/layout/AdminLayout.jsx`
- **Purpose:** an admin surface that looks intentional, not the same page seven times.
- **One memorable thing:** a **console layout** — a slim night sidebar (`bg-night`, world-neutral), a stat strip, and consistent `DataTable`s with proper empty/loading/error states and a sticky action bar. This is lower demo priority; keep it functional and tidy rather than flashy.
- **Components:** `AdminLayout` (sidebar + header), `DataTable`, `StatTile`, `Badge`, `Dialog` (confirm destructive), `Sheet` (create/edit forms on mobile), `EmptyState`, `Alert`.
- **Data:** the `*AdminApi` groups already in `lib/api.js`.
- **States:** every table gets loading (skeleton rows), empty (`EmptyState`), error (`Alert` + Retry).
- **A11y:** `DataTable` has a caption/`aria-label`; destructive actions confirm via `Dialog`; one `h1` per admin route.
- **Tests:** each admin page renders its table and an empty state; a destructive action opens a confirm dialog.
- **Accept:** standard checklist; consistent across all admin routes.

---

## 8. Asset strategy
- Course imagery is already seeded from Wikimedia Commons `thumbnailUrl`s (CC-licensed). Keep them; SIG-4 duotone unifies their look. Store attribution in the course `credits` field (F-8), surfaced small on course detail.
- No new heavy image assets. The paper grain is an inline SVG data-URI (no network). Sun/moon discs, foil sheen, world gradients are all CSS.
- Fonts: Fraunces + DM Sans from Google Fonts (already used), variable, `display=swap`, preloaded.
- 3D: reuse the existing R3F scene; do not add models. Keep `three`/`drei` pinned at the current versions.
- Icons: `lucide-react` (already a dependency). No new icon packs.

---

## 9. Verification (V) — how "done" is proved

### V-1 Walk script (commit it)
Create `packages/client/scripts/walk.mjs` (Playwright, generalising the existing scratch probe): log in as the demo learner, visit every route (`/`, `/courses`, a course detail, `/dashboard`, `/learn/:id`, `/quiz/:courseId`, `/certificates`, `/settings`, and admin routes as admin), and for each: assert exactly one `h1`, capture console errors / failed requests / 4xx-5xx `/api/` responses, and screenshot at 1366 and 400. Fail the run on any console error or missing `h1`. Add `npm run walk -w packages/client`. **A screen task is not done until the walk passes for it.**

### V-2 Accessibility gate
Add `@axe-core/playwright`; in the walk (or a dedicated `a11y.spec.js`) assert zero serious/critical axe violations on every route, at `data-font-size="huge"` and `data-high-contrast="true"`. Manual keyboard pass per screen: tab order sane, focus visible, focus moves to `h1` on navigation.

### V-3 Unit/component tests
Keep the 28 existing green. Each `F-*` primitive and each `S-*` screen adds the tests listed in its spec. Motion helpers get reduced-motion cases. Target: no screen merged without its test.

### V-4 Security regression tests
Every `SEC-*` ships the test named in §3. CI must run the gateway internal-route 404 test and the auth/enrollment/payment suites. The internal-route block is the one test that must never go red.

### V-5 CI + housekeeping (carry over from Phase 0–2)
- Confirm CI runs green on the branch (`gh run list --workflow=ci.yml`) — this was set up but never verified.
- Add `CODECOV_TOKEN` repo secret (still pending; user action).
- Push the local commits (`c5165b0`, `4c25a47`, `70b51eb`, and everything from this plan).
- `npm run docs:export` after every backend change; CI fails on OpenAPI drift.

### V-6 Before/after evidence (Phase 4)
`docs/screenshots/before/` is committed. Capture `docs/screenshots/after/` from the walk script and put a before/after strip in the README. Record a short GIF of: catalog → course detail (cover morph) → learn → quiz pass (celebrate) → certificate.

---

## 10. Suggested execution order (dependency-sorted)

```
SEC-1  ← release blocker, do first
SEC-2 … SEC-10   (parallelisable; SEC-2 before S-4)
F-1 → F-2 → F-3 → F-4 → F-5 → F-6 → F-7 → F-8   (F-1 blocks all screens)
B-1 (blocks S-2)   B-2,B-3 (block S-1)
S-1 → S-2 → S-3 → S-4 → S-5 → S-6 → S-7 → S-8 → S-9
V-1,V-2 stood up early (after F-7) so each screen is gated as it lands
V-5,V-6 at the end
```

**Definition of done for the whole effort:** SEC-1 verified closed by test; every screen passes the walk + axe at `huge` + reduced motion + high contrast; 28→(28+new) tests green; OpenAPI in sync; CI green; before/after evidence in the README. The product should feel like one warm, editorial, subject-coloured place — not seven white cards.
