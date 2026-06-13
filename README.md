# EduElderly — Accessible Learning Platform

An accessible e-learning platform designed with an **elderly-first** approach, built as a microservices monorepo using Node.js, Express, MongoDB, and React.

## Architecture Overview

EduElderly uses a **microservices architecture** with an API Gateway as the single entry point. Services communicate over REST with internal service authentication (`X-Service-Key`).

```
┌─────────────┐
│   Client     │  React 18 + Vite
│  (port 5173) │
└──────┬───────┘
       │
┌──────▼───────┐
│  API Gateway  │  JWT validation, rate limiting, CORS, proxy
│  (port 8080)  │
└──────┬───────┘
       │
┌──────▼────────────────────────────────────────────────────┐
│                    Downstream Services                     │
├──────────────┬──────────────┬──────────────┬──────────────┤
│ auth :3001   │ user :3002   │ course :3003 │ enroll :3004 │
├──────────────┼──────────────┼──────────────┼──────────────┤
│ quiz :3005   │ payment:3006 │ notif :3007  │ admin :3008  │
├──────────────┴──────────────┴──────────────┼──────────────┤
│                                            │ cert :3009   │
└────────────────────────────────────────────┴──────────────┘
       │
┌──────▼───────────────────────────────┐
│  MongoDB (27017)  │  Redis (6379)     │
└───────────────────┴───────────────────┘
```

### Email flow (auth)

Auth does not send email directly. It calls the notification service, which delivers via Brevo:

```
Client → Gateway /api/v1/auth/* → Auth → POST notification:3007/internal/send
                                              (X-Service-Key)
                                        → Brevo API
```

Supported auth email types: OTP, email verification, password reset. Templates live in `services/notification/src/templates/`.

On successful email verification, auth also creates a user profile via `POST /users/create` on the user service.

## Gateway routing

Routing and public-route rules are defined in `services/gateway/routes.config.js`:

- **JWT validation** at the gateway for protected routes (`issuer: eduelderly`, `audience: eduelderly-client`).
- **Public auth routes** (no Bearer token): register, login, verify-email, forgot/reset password, resend verification, refresh, logout, verify/resend OTP, change-password.
- **Service auth**: gateway injects `X-Service-Key`; user context is forwarded as `X-User-Id` and `X-User-Role` when present.

## Service map

| Service | Port | Description |
|---------|------|-------------|
| **api-gateway** | 8080 | Entry point — routing, auth validation, rate limiting, CORS |
| **auth-service** | 3001 | Registration, login, OTP (Redis), JWT issue/refresh, password reset |
| **user-service** | 3002 | Profiles, accessibility preferences, roles |
| **course-service** | 3003 | Course/module/topic CRUD, media upload |
| **enrollment-service** | 3004 | Enrollments, progress, XP |
| **quiz-service** | 3005 | Quizzes, attempts, adaptive difficulty |
| **payment-service** | 3006 | Orders, HMAC verification, refunds |
| **notification-service** | 3007 | Transactional email (Brevo), internal `/internal/send` |
| **admin-service** | 3008 | Analytics, user management, audit logs |
| **certificate-service** | 3009 | PDF certificates on completion |

## Project structure

```
EduElderly/
├── packages/
│   ├── shared/                 # Constants, DTOs, errors, middleware
│   └── client/                 # React 18 + Vite frontend (Phase 8)
├── services/
│   ├── gateway/                # API Gateway (8080)
│   │   └── routes.config.js    # Proxy targets + public route rules
│   ├── auth/
│   │   └── src/
│   │       ├── controllers/    # HTTP handlers
│   │       ├── services/       # Registration, session, password, tokens, mail
│   │       ├── clients/        # notification + user HTTP clients
│   │       ├── utils/          # JWT + OTP helpers
│   │       └── routes/
│   ├── notification/
│   │   └── src/
│   │       ├── clients/        # Brevo API client
│   │       └── templates/      # Branded HTML email layouts
│   └── …                       # user, course, enrollment, quiz, payment, admin, certificate
├── docker-compose.yml          # MongoDB, Redis, all services
├── package.json                # npm workspaces root
└── jest.config.js
```

## Prerequisites

- **Node.js** >= 18
- **npm** >= 8 (workspace support)
- **Docker** & **Docker Compose** (recommended)
- **MongoDB** 7.x and **Redis** 7.x (included in Docker Compose)

## Getting started

### 1. Clone

```bash
git clone https://github.com/your-org/EduElderly.git
cd EduElderly
```

### 2. Environment variables

Copy `.env.example` to `.env` for each service you run:

```bash
cp services/gateway/.env.example services/gateway/.env

for service in auth user course enrollment quiz payment notification admin certificate; do
  cp "services/$service/.env.example" "services/$service/.env"
done
```

**Windows (PowerShell):**

```powershell
Copy-Item services\gateway\.env.example services\gateway\.env

$services = @("auth","user","course","enrollment","quiz","payment","notification","admin","certificate")
foreach ($s in $services) {
  Copy-Item "services\$s\.env.example" "services\$s\.env"
}
```

For local email testing, set `BREVO_API_KEY` and a verified `BREVO_SENDER_EMAIL` in `services/notification/.env`. Never commit `.env` files.

### 3. Install

```bash
npm install
```

### 4. Run with Docker Compose (recommended)

```bash
docker compose up --build
```

Starts MongoDB, Redis, backend services on the internal network, gateway on **8080**, and the client on **5173**.

### 5. Run services locally (without Docker)

Ensure MongoDB and Redis are running, then:

```bash
cd services/gateway && npm run dev
cd services/auth && npm run dev
```

### 6. Health checks

```bash
curl http://localhost:8080/health
curl http://localhost:8080/health/auth
curl http://localhost:8080/health/course
```

Expected response shape:

```json
{
  "service": "<service-name>",
  "status": "healthy",
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

## Environment variables

### Gateway (`services/gateway/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | Listen port |
| `JWT_ACCESS_SECRET` | — | Must match auth service (access token verification) |
| `INTERNAL_SERVICE_KEY` | — | Shared inter-service key |
| `AUTH_SERVICE_URL` | `http://auth:3001` | Auth service URL |
| `USER_SERVICE_URL` | `http://user:3002` | User service URL |
| `NOTIFICATION_SERVICE_URL` | `http://notification:3007` | Notification service URL |
| `ALLOWED_ORIGINS` | `http://localhost:5173` | CORS origins |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Rate limit window |
| `RATE_LIMIT_MAX_REQUESTS` | `200` | Max requests per window |

See `services/gateway/.env.example` for all downstream service URLs.

### Auth (`services/auth/.env`)

| Variable | Description |
|----------|-------------|
| `MONGO_URI` | Auth database |
| `REDIS_URL` | OTP storage and attempt limits |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Token signing |
| `APP_URL` | Frontend base URL for verification/reset links |
| `NOTIFICATION_SERVICE_URL` | Internal email dispatch |
| `USER_SERVICE_URL` | Profile creation after verify-email |
| `INTERNAL_SERVICE_KEY` | Must match gateway |

### Notification (`services/notification/.env`)

| Variable | Description |
|----------|-------------|
| `BREVO_API_KEY` | Brevo API key |
| `BREVO_SENDER_EMAIL` | Verified sender address in Brevo |
| `BREVO_SENDER_NAME` | Display name (default: EduElderly) |
| `INTERNAL_SERVICE_KEY` | Protects `/internal/send` |

### All backend services

| Variable | Description |
|----------|-------------|
| `PORT` | Service port (3001–3009) |
| `MONGO_URI` | MongoDB connection string |
| `INTERNAL_SERVICE_KEY` | Shared secret with gateway |

## API routes (via gateway)

| Prefix | Target | Auth |
|--------|--------|------|
| `/api/v1/auth/*` | auth | Public routes listed in `routes.config.js`; others require JWT |
| `/api/v1/users/*` | user | JWT required |
| `/api/v1/courses/*` | course | JWT required (public GET catalog) |
| `/api/v1/enrollments/*` | enrollment | JWT required |
| `/api/v1/quizzes/*` | quiz | JWT required |
| `/api/v1/payments/*` | payment | JWT required |
| `/api/v1/notifications/*` | notification | JWT required |
| `/api/v1/admin/*` | admin | JWT required (admin role) |
| `/api/v1/certificates/*` | certificate | JWT required |

## Shared package (`@eduelderly/shared`)

- **Constants**: roles, content types, difficulty, transaction types
- **Errors**: `AppError`, `ERROR_CODES`
- **Middleware**: `globalErrorHandler`, `catchAsync`, `serviceAuth`
- **DTOs**: public user/course/enrollment shapes

```javascript
const { AppError, ERROR_CODES, globalErrorHandler, catchAsync } = require('@eduelderly/shared');
```

## Testing

```bash
npm test
```

Per-service:

```bash
cd services/auth && npm test
cd services/gateway && npm test
cd services/notification && npm test
```

**Windows note:** auth tests use a real MongoDB URI (`TEST_MONGO_URI`) because MongoMemoryServer can fail with `spawn EFTYPE`. Example:

```powershell
$env:TEST_MONGO_URI="mongodb://127.0.0.1:27017/eduelderly-auth-test"
cd services/auth; npm test
```

## Development scripts

| Command | Description |
|---------|-------------|
| `npm test` | Run tests in all workspaces |
| `docker compose up --build` | Build and start stack |
| `docker compose down` | Stop stack |
| `docker compose logs -f gateway` | Follow gateway logs |

## Build phases

| Phase | Focus | Status |
|-------|-------|--------|
| **0** | Monorepo, Docker, shared, gateway | Done |
| **1** | Auth — register, OTP, login, JWT, password reset, email via Brevo | Done |
| **2** | User + course services | Next |
| **3** | Enrollment + XP | Planned |
| **4** | Quiz service | Planned |
| **5** | Payment service | Planned |
| **6** | Notification (auth emails) + certificate | In progress |
| **7** | Admin service | Planned |
| **8** | Frontend (React) | Planned |
| **9** | Testing + deploy | Planned |

## Tech stack

- **Runtime**: Node.js 20 (Alpine in Docker)
- **Framework**: Express 5
- **Database**: MongoDB 7 (Mongoose)
- **Cache**: Redis 7 (OTP / rate-style limits)
- **Gateway**: http-proxy-middleware, JWT validation
- **Auth**: JWT access + refresh, bcrypt, Redis-backed OTP
- **Email**: Brevo (transactional)
- **Payment**: Razorpay (primary), Stripe (fallback)
- **Media**: Cloudinary / AWS S3
- **Frontend**: React 18 + Vite
- **Testing**: Jest + Supertest
- **Linting**: ESLint + Prettier
- **Containers**: Docker Compose

## License

ISC
