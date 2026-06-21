# Quiz Service

Module quizzes for enrolled learners. Questions are scored server-side; correct answers are never exposed on GET.

## Seed sample quizzes

Requires course seed first (`services/course` — quizzes resolve `courseId` / `moduleId` by course slug and module order).

```bash
npm run seed        # upsert by course + module + title
npm run seed:reset  # wipe quiz collections, then seed
```

Data: `scripts/data/sample-quizzes.json` — **9 quizzes**, **38 questions** across 6 published courses.

From repo root (courses + quizzes + demo learner):

```bash
npm run reseed
```

## Tests

```bash
docker compose up -d mongo
npm test
```
