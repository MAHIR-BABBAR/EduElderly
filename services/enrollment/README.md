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
| GET | `/` | List my enrollments |
| GET | `/:enrollmentId` | Get enrollment |
| GET | `/:enrollmentId/resume` | Resume position + next topic |
| PATCH | `/:enrollmentId/progress` | Mark topic complete |
| GET | `/:enrollmentId/topics/:topicId/content` | Enrolled-only content URL |
| DELETE | `/:enrollmentId` | Drop enrollment |

### Internal (`X-Service-Key`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/internal/enroll` | Create enrollment after successful payment |
| GET | `/internal/users/:userId/courses/:courseId` | Lookup active/completed enrollment |

## Content protection

Public course catalog no longer exposes `contentUrl` on topics. Learners fetch content only through the enrollment content gate after enrolling.

## Tests

```bash
docker compose up -d mongo
npm test
```

Uses `mongodb://127.0.0.1:27017/eduelderly-enrollment-test` by default.
