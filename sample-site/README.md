# EduElderly Sample Site

Static demo for the learner journey: **sign in → browse courses → enroll → take module quizzes**.

Served on **http://localhost:5173** when using Docker Compose.

## Prerequisites

1. `docker compose up` (gateway, auth, course, enrollment, quiz, mongo, redis)
2. Reseed databases after a fresh Mongo volume:

```bash
npm run reseed
```

This runs `course` `seed:reset` then `quiz` `seed:reset`.

## Manual seed (alternative)

```bash
cd services/course && npm run seed:reset
cd ../quiz && npm run seed:reset
```

## Demo flow

1. Open http://localhost:5173
2. Register or sign in (OTP codes are logged by the **auth** service in development)
3. Open **Healthy Living for Older Adults**
4. Click **Enroll (free)**
5. Under **Module quizzes**, click **Take quiz**
6. Submit answers and view your score

## Files

- `index.html` — layout
- `js/api.js` — gateway client
- `js/app.js` — UI logic
- `css/styles.css` — elderly-friendly styles (large text, high contrast toggle)
