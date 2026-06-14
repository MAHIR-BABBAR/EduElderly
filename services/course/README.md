# Course Service

## Local development

```bash
docker compose up -d mongo
cp .env.example .env
npm run dev
```

## Tests

Prerequisites:

```bash
docker compose up -d mongo
```

Then:

```bash
npm test
```

Tests use local MongoDB at `mongodb://127.0.0.1:27017/eduelderly-course-test` by default.

Public `GET /` returns published courses only. Admin mutations require gateway `X-User-Id` and `X-User-Role: admin` headers.
