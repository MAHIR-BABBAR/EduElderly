# Auth Service

## Local development

```bash
docker compose up -d mongo redis
cp .env.example .env
npm run dev
```

Required env: `MONGO_URI`, `REDIS_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `INTERNAL_SERVICE_KEY`, `USER_SERVICE_URL`.

For host development on Windows, use `REDIS_URL=redis://127.0.0.1:6379` (Redis port is exposed in `docker-compose.yml`).

## Tests

Prerequisites:

```bash
docker compose up -d mongo redis
```

Then:

```bash
npm test
```

Tests use local MongoDB at `mongodb://127.0.0.1:27017/eduelderly-auth-test` by default. OTP tests use an in-memory Redis mock via `setRedisClientForTests`.
