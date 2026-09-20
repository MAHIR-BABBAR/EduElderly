# EduElderly — Resume-Ready Plan

Goal: turn the current working MVP into a project a recruiter or senior engineer can open, run in one command, click through, and be impressed by in under five minutes. Two audiences matter: the person skimming the README, and the person reading the code.

Written 13 Sep 2026. Estimated total effort: ~12 working days solo. Phases are ordered by return on effort. Each phase ends in a commit and a working app.

---

## What "representable" means here

| Audience | What they check | What must be true |
|----------|-----------------|-------------------|
| README skimmer | Screenshots, live link, architecture, badges, tech list | Hero GIF, live demo URL, mermaid diagram, CI + coverage badges, "Highlights" section |
| Code reader | Structure, tests, CI, error handling, docs, consistency | Green CI, OpenAPI per service, ADRs, no dead code, no nested lockfiles |
| Clicker | Does it feel like a product? | Polished landing, smooth transitions, real course covers, celebration moments, no raw "Loading…" text |
| Interviewer | Can you explain the hard parts? | Async jobs, service trust model, idempotent payment flow, a11y system, adaptive UI prefs |

Resume bullets this plan unlocks (write these at the end, not now):

- Designed and built a 10-service Node/Express microservices platform behind an API gateway with JWT validation, gateway-trust header signing, per-service MongoDB, and Redis-backed OTP and job queues.
- Implemented asynchronous workflows (email, certificate PDF generation) with BullMQ, retries, and dead-letter handling.
- Built an accessible React 18 frontend (WCAG 2.2 AA) with user-driven font scaling, high-contrast mode, reduced-motion support, and Lighthouse accessibility score of 100.
- Shipped GitHub Actions CI running 180+ Jest/Supertest integration tests against MongoDB and Redis, plus Playwright end-to-end tests.
- Documented every service with OpenAPI 3 and aggregated docs at the gateway.

---

## Phase 0 — Stabilize and commit what exists (half a day)

The working tree currently holds the entire React client, the certificate-eligibility feature, and a learner self-confirm payment endpoint, all uncommitted. Land them cleanly first.

### 0.1 Fix known defects

- [ ] **Duplicate completion email.** `services/enrollment/src/services/progress.service.js` calls both `handleCourseCompletion` and `checkAndIssueCertificate` on completion. Remove the email from `handleCourseCompletion` (keep the XP path) and let the eligibility service own the single completion email, sending a "quizzes remaining" variant when the certificate is not yet earned.
- [ ] **Self-confirm order is unguarded.** `POST /payments/orders/:orderId/confirm` lets any learner mark their own order paid. Gate it behind `PAYMENT_PROVIDER=mock` (default in dev, refused with 404 in prod compose) and record `statusUpdatedBy: 'mock-provider'` rather than the learner id so audit logs are honest.
- [ ] **Nested lockfiles.** Delete `services/payment/package-lock.json` and `services/quiz/package-lock.json`; the root lock owns the workspace.
- [ ] **Root runtime deps.** Move `bcrypt`, `nodemailer`, `redis` out of root `package.json` into the services that use them.
- [ ] **Ignore rules.** Add `packages/client/test-results/` and `packages/client/playwright-report/` to `.gitignore`.
- [ ] **Gateway health probe timeout.** Wrap the fetch in `services/gateway/src/index.js` `/health/:service` with a 3 s AbortController.

### 0.2 Commit in three pieces

1. `fix(backend): single completion email, gated mock confirm, lockfile cleanup`
2. `feat(enrollment,quiz): certificate eligibility requires all course quizzes passed`
3. `feat(client): React 18 + Vite frontend with accessibility preferences` (include DESIGN.md)

Then open a PR from `feature/quiz-payment-demo` to `main` and merge. Everything after this happens on short-lived branches off `main`.

---

## Phase 1 — CI and quality gates (1 day)

Nothing signals "real project" faster than a green badge. Do this before any redesign so every later change is verified.

### 1.1 GitHub Actions

Create `.github/workflows/ci.yml` with four jobs:

| Job | Runs | Services |
|-----|------|----------|
| `lint` | `npm run lint` and `prettier --check` | none |
| `backend-tests` | matrix over the 10 services, `npm test --workspace` | `mongo:7`, `redis:7-alpine` as service containers |
| `client` | `vitest run`, `vite build`, upload `dist` artifact | none |
| `docker` | `docker compose -f docker-compose.prod.yml build` (gateway + one service is enough to prove the Dockerfile) | none |

Cache `~/.npm` keyed on the root lockfile. Add `concurrency` to cancel superseded runs.

### 1.2 Coverage

- [ ] Add `--coverage` to each service test script with `coverageReporters: ['text', 'lcov']`.
- [ ] Upload to Codecov (free for public repos) and add the badge. Set a global threshold of 70 percent in root `jest.config.js` so it is enforced, not aspirational.

### 1.3 Repo hygiene

- [ ] `.github/PULL_REQUEST_TEMPLATE.md` with a short checklist (tests, a11y, docs).
- [ ] `.github/dependabot.yml` for npm, weekly, grouped.
- [ ] `CONTRIBUTING.md` (short: branch naming, commit style, how to run tests).
- [ ] Branch protection on `main`: require CI green.

---

## Phase 2 — Backend depth (2 to 3 days)

The backend already has the hard parts right (gateway trust, per-service DBs, DTO stripping, security tests). What it lacks is the visible, interview-friendly layer on top. Pick in this order.

### 2.1 OpenAPI docs (0.5 day)

- [ ] Add `swagger-jsdoc` + `swagger-ui-express` to `@eduelderly/shared` as an opt-in helper: `mountDocs(app, { title, version, apis })`.
- [ ] Annotate routes in each service with JSDoc `@openapi` blocks. Start with auth, course, enrollment, quiz, payment. Admin, notification, certificate can follow.
- [ ] Gateway serves `/docs` with a landing page linking to each service's `/docs` (proxied, public in dev, admin-only in prod).
- [ ] Export the combined spec to `docs/openapi/` on CI so it is browsable in the repo.

### 2.2 Async jobs with BullMQ (1 day)

Redis is already in the stack. Move the two slow, failure-prone side effects into queues:

- [ ] `notification` service: `email` queue. `POST /internal/send` enqueues and returns 202. A worker in the same process calls Brevo with 3 retries and exponential backoff. Failed jobs land in a dead-letter list exposed at `GET /internal/jobs/failed` (admin).
- [ ] `certificate` service: `certificate-pdf` queue. Issue returns immediately with `status: 'pending'`; the worker renders the PDF with `pdfkit`, stores it, and flips status to `ready`. The client polls or the certificates page shows a "preparing" state.
- [ ] Add Bull Board at `admin` service `/queues` (admin JWT required) so the queue UI is a demo moment.

### 2.3 Certificate storage that actually works (0.5 day)

`NullStorage` means certificates cannot be downloaded today.

- [ ] Implement `LocalDiskStorage` (writes under `services/certificate/storage/`, already gitignored) and `S3Storage` behind the existing `StorageAdapter` interface, selected by `CERT_STORAGE=local|s3`.
- [ ] Add MinIO to `docker-compose.yml` so the S3 path is demoable locally.
- [ ] `GET /certificates/:certId/download` streams the PDF for the owner; verify page shows a preview thumbnail.

### 2.4 Payment provider adapter (0.5 day)

- [ ] Introduce `services/payment/src/providers/{PaymentProvider.js,MockProvider.js,RazorpayProvider.js}`. Mock stays fully functional. Razorpay implements `createOrder` and `verifyWebhookSignature` but is only wired when keys exist.
- [ ] Add `POST /payments/webhook` with HMAC verification and **idempotency** on `orderId` (a second webhook for a paid order is a no-op). This is the interview story: "confirmation enrolls first, then marks paid, and repeats are safe."

### 2.5 Small but visible wins

- [ ] Redis cache on `GET /courses` and `GET /courses/:id` (60 s TTL, invalidated on publish/update). Add `X-Cache: HIT|MISS` header.
- [ ] `prom-client` `/metrics` on the gateway (request count, latency histogram by route). One Grafana screenshot in the README is optional but cheap.
- [ ] `npm run demo:seed` at root: seeds categories, 6 courses with cover images and real YouTube lesson URLs, 3 quizzes, a learner account with progress, an admin account. Print credentials at the end. The README "Try it" section depends on this.
- [ ] Update README test counts and add the new env vars to `.env.example` files.

---

## Phase 3 — Frontend redesign (4 to 5 days)

The current client works but reads as a template. The fix is not more components, it is personality, rhythm, imagery, and motion, all inside the elderly-first constraints in `DESIGN.md`. Keep the tokens, keep the a11y system, replace the surface.

### 3.1 Design system pass (1 day)

- [ ] **Typography scale.** Define `--text-display / h1 / h2 / h3 / body / caption` with Fraunces on display and h1 only. Right now most headings render at the same size.
- [ ] **Color depth.** Add `--color-primary-soft` (teal tint) and `--color-surface-raised`, plus a warm gradient token for hero and CTA bands. Keep AA contrast; test with the high-contrast override.
- [ ] **Cards.** Add a `cover` slot with a 16:9 image and a generated gradient fallback keyed by category (so seeded courses without images still look intentional). Hover lifts 2 px with a 150 ms transition.
- [ ] **Buttons.** Add a pressed state (`active:scale-[0.98]`), loading state with a spinner slot, and an icon-leading variant.
- [ ] **New primitives:** `Toast` (Radix Toast, top-center, 44 px tall, persistent errors), `Tabs`, `Tooltip`, `Sheet` (mobile nav drawer), `StatTile`, `ProgressRing`, `Stepper`, `Avatar`, `DataTable` (sortable, paginated, keyboard-navigable).
- [ ] **Skeletons everywhere.** Replace every `<p role="status">Loading…</p>` with a shaped skeleton that shimmers (respects reduced motion).
- [ ] **Motion helpers.** Extend `components/marketing/motion.jsx` into `lib/motion.js`: `pageVariants`, `listStagger`, `fadeUp`, `springPop`. All gated on `prefers-reduced-motion` and on the design's calm-zone rule (≤200 ms inside the app, richer on landing only).
- [ ] **Route transitions.** Wrap `<Outlet>` in `AnimatePresence` with a 180 ms fade-and-rise. Scroll to top on navigation. Announce page title changes to screen readers via a live region.

### 3.2 Landing page (0.5 day)

- [ ] Replace the abstract 3D orbs with something that means something: a slow, warm scene of floating "lesson cards" and a certificate that drifts toward the viewer. Keep the WebGL fallback and reduced-motion static version.
- [ ] Add a real product screenshot section ("See the learning view") with a device frame.
- [ ] Trust strip with numbers that animate on scroll (count-up), fed from a public `GET /stats` on the gateway (courses, learners, certificates).
- [ ] Testimonials become a gentle auto-advancing carousel with pause on hover and keyboard controls.
- [ ] Footer with four columns (Learn, Support, Accessibility, Legal) and an accessibility statement page.

### 3.3 Catalog and course detail (0.5 day)

- [ ] Catalog: search box with debounce, filters for category, difficulty, and free/paid, sort by newest/popular, URL-synced state, result count, and server-side pagination using the existing pagination shape.
- [ ] Course detail: cover hero, "What you'll learn" list, curriculum accordion with module durations and lesson counts, instructor block, and a sticky enroll card (price, hours, topics, enroll button) that becomes a bottom bar on mobile.
- [ ] Paid flow: enroll → mock checkout page styled as a receipt → confirm → confetti → "Start learning".

### 3.4 Dashboard (0.5 day)

- [ ] Four stat tiles: XP, courses in progress, completed, certificates. Animated count-up on mount.
- [ ] "Continue learning" hero with cover image, next lesson title, progress ring, and a large resume button.
- [ ] Course grid with cover, progress bar, and status chip. Completed courses show a certificate badge.
- [ ] Recent activity list (last 5 lesson completions and quiz attempts) from a new `GET /enrollments/activity` endpoint.

### 3.5 Learning page (1 day)

This is the screen that sells the product. Give it a proper player layout.

- [ ] Two-column layout: content left, curriculum right with module accordion, lesson checkmarks, and the current lesson highlighted. On mobile the curriculum becomes a bottom sheet.
- [ ] Previous / next lesson controls, keyboard shortcuts (`[` `]`), and a "Mark complete and continue" primary action that auto-advances.
- [ ] Lesson header with module name, lesson number of total, duration, and a progress ring.
- [ ] Video lessons get a captions reminder and a "watch on YouTube" link; article lessons render in a reader-mode container with adjustable width.
- [ ] Completion: when the last lesson is marked done, a celebration card with confetti (reduced-motion: static badge), then the quiz call-to-action.

### 3.6 Quiz (0.5 day)

- [ ] One question at a time with a stepper across the top and "Question 3 of 8".
- [ ] Large answer cards with letter badges (A, B, C, D), selected state, and keyboard support (number keys).
- [ ] Review screen before submit listing every answer with jump links, then the existing confirm dialog.
- [ ] Result screen: animated score ring, pass/fail message, per-question review with correct/incorrect markers, and a "retry" or "back to course" action. Certificate earned state shows the certificate card inline.

### 3.7 Certificates, settings, auth (0.5 day)

- [ ] Certificates: gallery of certificate cards with a rendered preview, download PDF, copy verify link, share buttons. Verify page shows the certificate preview with a green verified ribbon.
- [ ] Settings: live preview panel that updates as font size and contrast change, plus a theme selector (light, warm-dark, high-contrast). Persist through the existing profile API.
- [ ] Auth pages: split layout with an illustration column on desktop, inline validation messages, password strength meter, OTP input as six large boxes with paste support and no countdown pressure.

### 3.8 Admin (0.5 day)

- [ ] Dashboard: four stat tiles plus two Recharts charts (enrollments over time, revenue by course). Read the `dataviz` guidance before choosing colors.
- [ ] Users, courses, orders: `DataTable` with sorting, pagination, search, and row actions.
- [ ] Course editor: `react-hook-form` + `zod`, drag-to-reorder modules and lessons (dnd-kit), autosave indicator.
- [ ] Every mutation shows a toast; every destructive action confirms.

### 3.9 Global polish

- [ ] Error boundary page and a designed 404.
- [ ] Route-level code splitting with `React.lazy` for admin and learning.
- [ ] Favicon set, OpenGraph tags, `manifest.webmanifest` so it installs as a PWA.
- [ ] Lighthouse targets on the landing and learning pages: Performance ≥ 90, Accessibility 100, Best Practices ≥ 95.

---

## Phase 4 — Verification, docs, and demo (1.5 days)

### 4.1 Tests

- [ ] Vitest: unit tests for `lib/api.js` error mapping, `motion.js` reduced-motion gating, and `AccessibilityContext` document attributes.
- [ ] Playwright: one full happy path against the seeded stack (register → OTP → enroll → complete lessons → pass quiz → certificate visible → verify URL). Run it in CI behind a `docker compose up` step.
- [x] Axe accessibility scan in Playwright on every public page.

### 4.2 Documentation

- [ ] README rewrite: hero GIF (record with the seeded demo), live demo link and credentials, mermaid architecture diagram, "Highlights" section (5 bullets), quick start, badges (CI, coverage, license), screenshots grid, link to docs.
- [x] `docs/adr/`: five short Architecture Decision Records. Suggested: gateway-trust headers instead of service mesh; per-service databases; certificate eligibility owned by enrollment; BullMQ for side effects; accessibility preferences stored server-side.
- [x] `docs/architecture.md` with the request flow, the internal-route map, and the event flow after the queue work.

### 4.3 Live demo

- [ ] Deploy `docker-compose.prod.yml` to a single small VM (Hetzner CX22 or Oracle free tier) behind Caddy for automatic TLS. Frontend built and served by Caddy, API proxied to the gateway.
- [ ] Nightly `npm run demo:seed` cron on the VM so demo data stays clean.
- [ ] Add the URL and demo credentials to the README.

---

## Order of work and checkpoints

| Week | Days | Deliverable |
|------|------|-------------|
| 1 | 1 | Phase 0 merged to main, Phase 1 CI green with badges |
| 1 | 2–4 | Phase 2: docs, queues, storage, payment adapter, seed |
| 2 | 5–9 | Phase 3: design system, then pages in the order listed |
| 2 | 10–11 | Phase 4: E2E, README, ADRs, deploy |

Cut order if time runs short: Razorpay adapter → Bull Board → admin charts → PWA → S3 storage (keep local disk). Do not cut CI, the seed script, the landing and learning redesign, or the README.

---

## Definition of done

1. `git clone && npm install && docker compose up --build && npm run demo:seed` gives a working, seeded app in under five minutes.
2. CI is green on `main` with coverage above 70 percent.
3. A stranger can register, enroll, learn, pass a quiz, and download a certificate without reading instructions.
4. Every service exposes `/docs`.
5. The README has a GIF, a live link, and an architecture diagram above the fold.
