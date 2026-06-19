# Enrollment Service

Enrollment, progress tracking, XP awards, resume learning, and enrolled-only content access.

## Local development

```bash
docker compose up -d mongo course user payment
cp .env.example .env
npm run dev
```

## Required env

- `MONGO_URI`
- `INTERNAL_SERVICE_KEY`
- `COURSE_SERVICE_URL`
- `USER_SERVICE_URL`
- `PAYMENT_SERVICE_URL` (paid courses delegate checkout here)

## API surfaces

### User (via gateway `/api/v1/enrollments`, JWT required)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/` | Enroll — free creates record; paid returns `202` + checkout from payment service |
| GET | `/` | List my enrollments (includes `course.title`, `course.thumbnailUrl`) |
| GET | `/:enrollmentId` | Get enrollment + course summary + resume (`nextTopicId`, etc.) |
| GET | `/:enrollmentId/resume` | Resume only (active enrollments; prefer `GET /:enrollmentId`) |
| PATCH | `/:enrollmentId/progress` | Mark topic complete |
| GET | `/:enrollmentId/topics/:topicId/content` | Enrolled-only content URL |
| DELETE | `/:enrollmentId` | Drop enrollment |

### Internal (`X-Service-Key`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/internal/enroll` | Create enrollment after successful payment |
| GET | `/internal/users/:userId/courses/:courseId` | Lookup active/completed enrollment |

## Dashboard / list enrichment

`GET /` does **not** duplicate course data in MongoDB. For each unique `courseId` in the page, the service calls course `GET /internal/courses/:id/stats` and merges `title`, `thumbnailUrl`, and `instructorName` into the JSON response under `course`.

## Learn page detail

`GET /:enrollmentId` returns the same enrollment fields plus nested `course` summary and resume fields (`nextTopicId`, `currentModuleId`, `currentLessonId`) so the client can skip a separate `/resume` call.

## Content protection

Public course catalog no longer exposes `contentUrl` on topics. Learners fetch content only through the enrollment content gate after enrolling.

## Tests

```bash
docker compose up -d mongo
npm test
```

Uses `mongodb://127.0.0.1:27017/eduelderly-enrollment-test` by default.
