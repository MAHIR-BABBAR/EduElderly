# EduElderly — Accessible Learning Platform

An accessible e-learning platform designed with an **elderly-first** approach, built as a microservices monorepo using Node.js, Express, MongoDB, and React.

---

## Architecture Overview

EduElderly follows a **microservices architecture** with an API Gateway as the single entry point. All services communicate through REST APIs with internal service authentication.

```
┌─────────────┐
│   Client     │  React 18 + Vite
│  (port 5173) │
└──────┬───────┘
       │
┌──────▼───────┐
│  API Gateway  │  Express + http-proxy-middleware
│  (port 8080)  │  Auth validation, rate limiting, CORS
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
┌──────▼───────┐
│   MongoDB     │  mongo:7 (port 27017)
└──────────────┘
```

---

## Service Map

| Service | Port | Description |
|---------|------|-------------|
| **api-gateway** | 8080 | Single entry point — routes, auth validation, rate limiting, CORS |
| **auth-service** | Internal | Registration, login, OTP verification, JWT issue & refresh, password reset |
| **user-service** | Internal | Profile management, accessibility preferences (font size, contrast), role management |
| **course-service** | Internal | Category, Course, Module, Topic CRUD; media upload to Cloudinary/S3 |
| **enrollment-service** | Internal | Enrollment creation, lesson tracking, XP accumulation, completion %, resume learning |
| **quiz-service** | Internal | Quiz creation, question bank, attempt submission, adaptive difficulty engine |
| **payment-service** | Internal | Order creation, HMAC signature verification, transaction records, refund handling |
| **notification-service** | Internal | Email dispatch (welcome, enrol, quiz result, completion), inactivity reminders |
| **admin-service** | Internal | Analytics aggregation, user management, CSV export, audit logging |
| **certificate-service** | Internal | PDF certificate generation on course completion, cloud storage, unique cert ID |

---

## Project Structure

```
eduelderly-root/
├── packages/
│   ├── shared/                 # Shared constants, DTOs, errors, middleware
│   │   ├── constants/          # roles, contentTypes, difficulty, transactionTypes
│   │   ├── dtos/               # UserDTO, CourseDTO, EnrollmentDTO
│   │   ├── errors/             # AppError class, errorCodes enum
│   │   ├── middleware/         # globalErrorHandler, serviceAuth
│   │   └── index.js            # Barrel export
│   └── client/                 # React 18 + Vite frontend (Phase 8)
│
├── services/
│   ├── gateway/                # API Gateway (port 8080)
│   ├── auth/                   # Auth Service (port 3001)
│   ├── user/                   # User Service (port 3002)
│   ├── course/                 # Course Service (port 3003)
│   ├── enrollment/             # Enrollment Service (port 3004)
│   ├── quiz/                   # Quiz Service (port 3005)
│   ├── payment/                # Payment Service (port 3006)
│   ├── notification/           # Notification Service (port 3007)
│   ├── admin/                  # Admin Service (port 3008)
│   └── certificate/            # Certificate Service (port 3009)
│
├── docker-compose.yml          # All services + MongoDB
├── package.json                # npm workspaces root
├── .eslintrc.js                # ESLint config (Node.js + React overrides)
├── .prettierrc                 # Prettier config
├── jest.config.js              # Jest workspace config
└── .gitignore                  # Ignores .env files and node_modules
```

---

## Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 8.0.0 (with workspace support)
- **Docker** & **Docker Compose** (for containerized development)
- **MongoDB** 7.x (runs via Docker Compose, or install locally)

---

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/EduEarly.git
cd EduEarly
```

### 2. Set Up Environment Variables

Copy `.env.example` to `.env` for **every service**:

```bash
# Gateway
cp services/gateway/.env.example services/gateway/.env

# All other services
for service in auth user course enrollment quiz payment notification admin certificate; do
  cp services/$service/.env.example services/$service/.env
done
```

On **Windows (PowerShell)**:

```powershell
Copy-Item services\gateway\.env.example services\gateway\.env

$services = @("auth","user","course","enrollment","quiz","payment","notification","admin","certificate")
foreach ($s in $services) {
  Copy-Item "services\$s\.env.example" "services\$s\.env"
}
```

Update the `.env` files with your actual secrets for production. The defaults work for local development.

### 3. Install Dependencies

```bash
npm install
```

This installs dependencies for all workspaces (`packages/*` and `services/*`), including the shared package via `workspace:*` references.

### 4. Run with Docker Compose (Recommended)

```bash
docker compose up --build
```

This starts:
- MongoDB on port **27017**
- All 9 backend services internally on Docker network `eduelderly-net`
- API Gateway **publicly** on port **8080**
- Client **publicly** on port **5173**

### 5. Run Individual Services (Without Docker)

Make sure MongoDB is running locally, then:

```bash
# Start the gateway
cd services/gateway && npm run dev

# Start any service
cd services/auth && npm run dev
```

### 6. Verify Health

```bash
# Gateway health check
curl http://localhost:8080/health

# Check a specific service through the gateway
curl http://localhost:8080/health/auth
curl http://localhost:8080/health/course
```

All services should return:
```json
{
  "service": "<service-name>",
  "status": "healthy",
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

---

## Environment Variables

### Gateway (`services/gateway/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | Gateway listen port |
| `NODE_ENV` | `development` | Environment mode |
| `AUTH_SERVICE_URL` | `http://auth:3001` | Auth service URL |
| `USER_SERVICE_URL` | `http://user:3002` | User service URL |
| `COURSE_SERVICE_URL` | `http://course:3003` | Course service URL |
| `ENROLLMENT_SERVICE_URL` | `http://enrollment:3004` | Enrollment service URL |
| `QUIZ_SERVICE_URL` | `http://quiz:3005` | Quiz service URL |
| `PAYMENT_SERVICE_URL` | `http://payment:3006` | Payment service URL |
| `NOTIFICATION_SERVICE_URL` | `http://notification:3007` | Notification service URL |
| `ADMIN_SERVICE_URL` | `http://admin:3008` | Admin service URL |
| `CERTIFICATE_SERVICE_URL` | `http://certificate:3009` | Certificate service URL |
| `JWT_ACCESS_SECRET` | — | JWT signing secret |
| `INTERNAL_SERVICE_KEY` | — | Inter-service auth key |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Rate limit window (ms) |
| `RATE_LIMIT_MAX_REQUESTS` | `200` | Max requests per window |
| `ALLOWED_ORIGINS` | `http://localhost:5173` | CORS allowed origins |

### All Backend Services

| Variable | Description |
|----------|-------------|
| `PORT` | Service listen port (3001–3009) |
| `MONGO_URI` | MongoDB connection string |
| `INTERNAL_SERVICE_KEY` | Must match gateway's key |

> See each service's `.env.example` for service-specific variables (Cloudinary, Razorpay, SendGrid, etc.)

---

## API Routes (via Gateway)

All API routes are prefixed with `/api/v1/` and proxied through the gateway:

| Prefix | Routes To | Auth Required |
|--------|-----------|---------------|
| `/api/v1/auth/*` | auth-service | No (public) |
| `/api/v1/users/*` | user-service | Yes |
| `/api/v1/courses/*` | course-service | Yes (GET `/courses` is public) |
| `/api/v1/enrollments/*` | enrollment-service | Yes |
| `/api/v1/quizzes/*` | quiz-service | Yes |
| `/api/v1/payments/*` | payment-service | Yes |
| `/api/v1/notifications/*` | notification-service | Yes |
| `/api/v1/admin/*` | admin-service | Yes (admin only) |
| `/api/v1/certificates/*` | certificate-service | Yes |

---

## Shared Package (`@eduelderly/shared`)

The shared package provides common utilities used across all services:

- **Constants**: `ROLES`, `CONTENT_TYPES`, `DIFFICULTY`, `TX_STATUS`, `TX_TYPE`
- **Errors**: `AppError` class, `ERROR_CODES` enum
- **Middleware**: `globalErrorHandler`, `catchAsync`, `serviceAuth`
- **DTOs**: `toPublicUserDTO`, `toPublicCourseDTO`, `toPublicEnrollmentDTO`

Usage in any service:
```javascript
const { AppError, ERROR_CODES, globalErrorHandler, catchAsync } = require('@eduelderly/shared');
```

---

## Testing

```bash
# Run all tests across all workspaces
npm test

# Run tests for a specific service
cd services/gateway && npm test

# Run with coverage
npx jest --coverage
```

---

## Development Scripts

| Command | Description |
|---------|-------------|
| `npm test` | Run tests in all workspaces |
| `docker compose up` | Start all services with Docker |
| `docker compose up --build` | Rebuild and start all services |
| `docker compose down` | Stop all services |
| `docker compose logs -f gateway` | Follow gateway logs |

---

## Build Phases

| Phase | Focus | Status |
|-------|-------|--------|
| **0** | Foundation — monorepo, Docker, shared, gateway | ✅ Complete |
| **1** | Auth Service — register, OTP, login, JWT | 🔜 Next |
| **2** | User + Course Services | ⬜ Planned |
| **3** | Enrollment + XP | ⬜ Planned |
| **4** | Quiz Service | ⬜ Planned |
| **5** | Payment Service | ⬜ Planned |
| **6** | Notification + Certificate | ⬜ Planned |
| **7** | Admin Service | ⬜ Planned |
| **8** | Frontend (React) | ⬜ Planned |
| **9** | Testing + Deploy | ⬜ Planned |

---

## Tech Stack

- **Runtime**: Node.js 20 (Alpine Docker images)
- **Framework**: Express.js
- **Database**: MongoDB 7 (Mongoose ODM)
- **Gateway**: http-proxy-middleware
- **Auth**: JWT (access + refresh tokens), bcrypt, OTP
- **Payment**: Razorpay (primary), Stripe (fallback)
- **Email**: SendGrid / Nodemailer
- **Media**: Cloudinary / AWS S3
- **PDF**: PDFKit
- **Frontend**: React 18 + Vite
- **Testing**: Jest + Supertest
- **Linting**: ESLint + Prettier
- **Containerization**: Docker + Docker Compose

---

## License

ISC
