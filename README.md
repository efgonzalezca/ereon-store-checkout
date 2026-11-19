# ereon-store-checkout

Mobile-first e-commerce checkout SPA backed by a REST API. A customer buys a product with a credit card (sandbox mode) through a 5-step flow:

1. **Product page:** product details, stock and quantity selector.
2. **Card and delivery modal:** customer, shipping and card data with validation.
3. **Payment summary:** Material Design backdrop with the cost breakdown.
4. **Final status:** payment result (`APPROVED`, `DECLINED`, `ERROR`, `PENDING`, `VOIDED`).
5. **Back to the product page** with the stock updated.

| | URL |
| :--- | :--- |
| Frontend app | _Pending_ |
| Backend API | _Pending_ |
| API docs | [Postman collection](docs/postman_collection.json) |

---

## 1. Architecture and technical decisions

### Backend (NestJS)

Hexagonal architecture (Ports & Adapters): each module separates `domain/`, `application/use-cases/` and `infrastructure/`. Business logic never lives in controllers or repository adapters.

```text
backend/src/
├── config/        # environment validation
├── database/      # TypeORM connection
├── health/        # GET /api/health
├── modules/       # Pending: products, customers, transactions, deliveries
└── shared/
    ├── rop/          # Result<T, E> and typed domain errors
    ├── interceptors/ # ResultInterceptor
    ├── filters/      # GlobalExceptionFilter
    └── logger/       # JSON logger, trace id and redaction
```

**Railway Oriented Programming.** Use cases never throw for business rules; they return `Result<T, DomainError>` and chain steps with `map` / `flatMap`. Controllers return the `Result` as is, and a global `ResultInterceptor` maps it to HTTP:

| Domain error | HTTP |
| :--- | :--- |
| `NotFoundError` | `404` |
| `OutOfStockError`, `InvalidTransactionStateError` | `409` |
| `PaymentDeclinedError`, `VoidedTransactionError` | `422` |
| `GatewayError` | `502` |

A global `GlobalExceptionFilter` handles only unexpected errors: it logs them and answers `500` without exposing stack traces.

### Frontend (React + Redux Toolkit)

_Pending._

---

### Infrastructure

_Pending._

---

## 2. Data model

_Pending._

---

## 3. Security (OWASP)

Implemented in the backend:

- **Security headers:** `helmet` with CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy` and `X-Frame-Options`.
- **CORS:** explicit allowed origins from `CORS_ORIGIN`; wildcards are rejected at startup.
- **Input validation:** `ValidationPipe` with `whitelist` and `forbidNonWhitelisted`; unknown fields return `400`.
- **Rate limiting:** global limit per client (`THROTTLE_TTL`, `THROTTLE_LIMIT`).
- **Safe errors:** unexpected failures return `500` with no internal details.
- **Log hygiene:** sensitive fields (card data, keys, authorization) are redacted from logs, and request headers are never logged.
- **Traceability:** `X-Trace-Id` is propagated to every log line and returned in the response.

---

## 4. API documentation

Postman collection: [`docs/postman_collection.json`](docs/postman_collection.json).

| Method | Path | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Healthcheck |

---

## 5. Tests and coverage

Jest `^30` with a `coverageThreshold` of 80% (statements, branches, functions, lines). The build fails if coverage drops below it.

```bash
make test        # run once (stack must be running)
make coverage    # with coverage report
```

---

## 6. Local setup

**Requirements:** Docker with Compose, `make`, and Node.js `24.19.0` (`nvm use` reads `backend/.nvmrc`) only if you run outside Docker.

```bash
cp backend/.env.example backend/.env   # adjust values if needed
make dev                               # PostgreSQL + backend with hot reload
curl http://localhost:3000/api/health
```

### Make targets

| Target | Description |
| :--- | :--- |
| `make dev` | Build and start the stack |
| `make down` | Stop the stack |
| `make status` | Show running services |
| `make logs` | Follow logs (JSON lines on stdout) |
| `make build` | Rebuild the backend image |
| `make test` | Run Jest once |
| `make coverage` | Run Jest with coverage |

### Environment variables (`backend/.env.example`)

| Variable | Description |
| :--- | :--- |
| `PORT` | HTTP port |
| `NODE_ENV` | `development`, `production` or `test` |
| `CORS_ORIGIN` | Allowed origin(s), comma separated |
| `THROTTLE_TTL` | Rate limit window, in seconds |
| `THROTTLE_LIMIT` | Max requests per window and client |
| `DB_HOST`, `DB_PORT` | PostgreSQL host and port |
| `DB_USER`, `DB_PASS`, `DB_NAME` | PostgreSQL credentials and database |
| `DB_SSL` | `true` to enable SSL (certificate is verified) |

### Running without Docker

```bash
cd backend && nvm use && npm ci
npm run start:dev    # needs a reachable PostgreSQL configured in backend/.env
npm run test:cov
```

---

## 7. Sandbox test cards

_Pending._

---

## 8. AI assistants usage

_Pending._
