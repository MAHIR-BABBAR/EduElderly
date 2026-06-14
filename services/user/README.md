# User Service

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

Tests use local MongoDB at `mongodb://127.0.0.1:27017/eduelderly-user-test` by default.

Internal endpoints (`POST /internal/profile`, `PATCH /internal/sync`) require `X-Service-Key` matching `INTERNAL_SERVICE_KEY`.
