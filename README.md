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
├── database/      # TypeORM connection, data-source, migrations and seeds
├── health/        # GET /api/health
├── modules/
│   ├── products/  # domain/, application/use-cases/, infrastructure/
│   └── customers/ # same layers; upserts customers by document type and number
│                  # Pending: transactions, deliveries
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

The frontend is a React 19 single-page app built with Vite and TypeScript. State lives in a Redux Toolkit store with a one-way data flow: components dispatch actions, reducers update the store, and components read it back through selectors. Each feature keeps its slice, components and styles together under `features/`.

```text
frontend/src/
├── app/               # store and typed hooks
├── config/            # environment parsing (VITE_API_URL)
├── features/products/ # slice, catalog, product card and detail modal
├── shared/            # axios client, currency formatting, modal
└── test/              # Jest setup and render helpers
```

How the pieces fit together:

- **Catalog and product detail.** The catalog is a responsive grid of product cards. Choosing one opens its detail in a modal, so the user keeps the context of the catalog behind it. The modal is a native `<dialog>`, which provides focus trapping and `Esc` handling out of the box, and it is closed with its close button; a stray tap outside it does not discard the selection. Quantity is picked from a short list that goes from 1 up to the available stock, so no input validation is needed, and the pay button is disabled when a product is out of stock.
- **Data access.** The axios client is injected into the store as the thunk extra argument. Only `main.tsx` reads the environment, which lets tests run against a fake client without mocking modules.
- **Layout.** Designed mobile first for a 375×667 viewport using Flexbox and Grid, without hiding overflow. From 768 px the modal places the image beside the product details. Colors and spacing are CSS variables in `index.css`.
- **Prices and images.** The API returns prices in cents and the UI formats them as Colombian pesos. Product images are square 640×640 `.webp` files (under 25 kB each) in `frontend/public/images/products/`, served by the same origin as the app; the database only stores their relative path.

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
| `GET` | `/api/products` | List products |
| `GET` | `/api/products/:id` | Get a product by UUID (`400` if not a UUID, `404` if it does not exist) |

---

## 5. Tests and coverage

Jest `^30` with a `coverageThreshold` of 80% (statements, branches, functions, lines). The build fails if coverage drops below it.

```bash
make test                # backend, run once (stack must be running)
make coverage            # backend, with coverage report
make test-frontend       # frontend, run once
make coverage-frontend   # frontend, with coverage report
```

---

## 6. Local setup

**Requirements:** Docker with Compose, `make`, and Node.js `24.19.0` (`nvm use` reads the `.nvmrc` of each project) only if you run outside Docker.

```bash
cp backend/.env.example backend/.env   # adjust values if needed
cp frontend/.env.example frontend/.env
make dev                               # PostgreSQL + backend + frontend with hot reload
make upgrade                           # run migrations (in another terminal)
make seed                              # load demo products (idempotent)
curl http://localhost:3000/api/health  # backend
# frontend: http://localhost:5173
```

### Make targets

| Target | Description |
| :--- | :--- |
| `make dev` | Build and start the stack (renews the `node_modules` volume so new dependencies are picked up) |
| `make down` | Stop the stack |
| `make status` | Show running services |
| `make logs` | Follow logs (JSON lines on stdout) |
| `make build` | Rebuild the backend image |
| `make test` | Run Jest once |
| `make coverage` | Run Jest with coverage |
| `make test-frontend` | Run the frontend Jest suite once |
| `make coverage-frontend` | Run the frontend Jest suite with coverage |
| `make migrate m="Name"` | Generate a migration from entity changes and run it |
| `make upgrade` | Run pending migrations |
| `make downgrade` | Revert the last migration |
| `make seed` | Load demo products; safe to run more than once and it never resets existing stock |

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

### Environment variables (`frontend/.env.example`)

| Variable | Description |
| :--- | :--- |
| `VITE_API_URL` | Base URL of the backend API (must be `http` or `https`) |

### Running without Docker

```bash
cd backend && nvm use && npm ci
npm run start:dev    # needs a reachable PostgreSQL configured in backend/.env
npm run test:cov

cd ../frontend && nvm use && npm ci
npm run dev          # http://localhost:5173
npm run test:cov
```

---

## 7. Sandbox test cards

_Pending._

---

## 8. AI assistants usage

_Pending._
