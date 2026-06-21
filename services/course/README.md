# Course Service

Category → Course → Module → Topic catalog for EduElderly. Public learners see **published** courses only. Admins manage content via gateway JWT.

## Local development

```bash
docker compose up -d mongo
cp .env.example .env
npm run dev
```

## Seed sample courses

```bash
npm run seed        # upsert by slug (safe to re-run)
npm run seed:reset  # wipe course collections, then seed
```

Data file: `scripts/data/sample-courses.json`. Attribution: [scripts/data/SAMPLE-COURSES-ATTRIBUTION.md](scripts/data/SAMPLE-COURSES-ATTRIBUTION.md).

After seeding, verify:

```bash
curl http://localhost:3003/
curl http://localhost:8080/api/v1/courses   # via gateway
```

To reseed courses, quizzes, and the demo learner together: `npm run reseed` from the repo root.

## Tests

```bash
docker compose up -d mongo
npm test
```

Tests use `mongodb://127.0.0.1:27017/eduelderly-course-test` by default.

## API surfaces

### Public (no auth)

| Method | Path | Gateway |
|--------|------|---------|
| GET | `/` | `/api/v1/courses` |
| GET | `/:courseId` | `/api/v1/courses/:courseId` |
| GET | `/categories` | `/api/v1/categories` |

### Admin (JWT + `role: admin` at gateway)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/admin/courses` | List drafts and published |
| GET | `/admin/courses/:courseId` | Preview draft with modules/topics |
| POST | `/` | Create course |
| PUT | `/:courseId` | Update course |
| PATCH | `/:courseId/publish` | Publish toggle |
| DELETE | `/:courseId` | Soft delete |
| CRUD | `/categories` | Categories |
| CRUD | `/:courseId/modules`, `/modules/:id`, topics | Content tree |

**Adding content (MVP):** paste `thumbnailUrl` and topic `contentUrl` as strings — no file upload.

### Internal (service-to-service)

| Method | Path | Header |
|--------|------|--------|
| GET | `/internal/courses/:courseId` | `X-Service-Key` — published course validation |
| GET | `/internal/courses/:courseId/stats` | `X-Service-Key` — topic counts for enrollment |

## Content protection roadmap

**Today:** Public `GET /:courseId` returns topic metadata **without** `contentUrl`. Enrolled learners fetch URLs via `GET /api/v1/enrollments/:id/topics/:topicId/content`.

**Phase 2 — Enrollment gate (recommended next step):**

1. **Stop exposing raw URLs in public course detail.** Public `GET /:courseId` returns topic metadata without `contentUrl`.
2. Add **enrolled-only endpoint:** `GET /api/v1/enrollments/:id/topics/:topicId/content` (enrollment service checks JWT + active enrollment, then returns the URL or proxied content).
3. Learning viewer fetches content only after enroll.

**Phase 3 — Hosted assets:**

1. Upload videos/PDFs to private storage (S3 / Cloudinary with restricted access).
2. Serve via **short-lived signed URLs** generated only after enrollment verification.
3. Optional content proxy through course or enrollment service to avoid leaking storage paths.

**Phase 4 — Hardening:**

- Rate-limit content endpoints
- Audit log for content access
- Watermark PDFs per user (optional)
- DRM for premium video (post-MVP)

This keeps MVP simple (link paste + seed script) while giving a clear path to paid, protected content later.
