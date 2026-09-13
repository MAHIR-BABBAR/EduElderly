# Contributing

## Setup

```bash
npm install
docker compose up -d mongo redis      # infra only
cp services/<name>/.env.example services/<name>/.env   # per service you run
```

Run a service with `npm run dev --workspace=services/<name>` and the client with `npm run dev:client`.

## Branches and commits

- Branch from `main`: `feature/<topic>`, `fix/<topic>`, `chore/<topic>`.
- Conventional commits: `feat(scope): …`, `fix(scope): …`, `chore: …`, `docs: …`, `test: …`. Scope is the service or package name.
- Keep commits focused. One behaviour change per commit.

## Tests

Every backend service runs two Jest projects: `integration` (needs Mongo on `127.0.0.1:27017`) and `security` (no database).

```bash
npm test --workspace=services/enrollment
npm run test --workspace=@eduelderly/client
npm run lint
```

CI runs all of this on every pull request against Mongo and Redis service containers.

## Pull requests

Fill in the template. Explain what changed and how to verify it. Any UI change must keep the accessibility rules in `DESIGN.md`: 44 px targets, visible focus, labels on every control, AA contrast, motion under 200 ms inside the app.
