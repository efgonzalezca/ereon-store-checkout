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
│   ├── customers/ # same layers; upserts customers by document type and number
│   ├── payments/  # payment gateway port and adapter; acceptance tokens, card tokenization and charges
│   ├── transactions/ # creates PENDING transactions, quotes amounts and processes the payment
│   └── deliveries/   # delivery records created when a payment is approved
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
| `DuplicateReferenceError`, `CardRejectedError` | `422` |
| `GatewayError` | `502` |

A global `GlobalExceptionFilter` handles only unexpected errors: it logs them and answers `500` without exposing stack traces.

**Known limitations of the payment flow.** Two situations can happen that the API does not resolve on its own:

- **A payment that stays `PENDING`.** After the gateway accepts a charge, the backend polls it for a few seconds. In the sandbox the final result sometimes arrives later than that window, so the transaction is stored as `PENDING` with its gateway id and the API answers `200` with that status. The stock is not touched and no delivery is created, even if the gateway later approves or declines the payment. Reconciling a `PENDING` transaction against the gateway is not implemented, and neither is paying it again (the API answers `409`).
- **Two buyers for the last unit.** The stock is checked when the quote is requested, when the transaction is created and again right before charging, so a product that another buyer already took is rejected with `409` before reaching the gateway. Two payments that overlap during the few seconds of the charge can still both pass that check and be approved by the gateway; then the stock update only succeeds for the first one. The second request is rolled back and answers `409`, but the charge already made at the gateway is not reversed: there is no automatic void or refund, so that payment has to be handled manually.

### Frontend (React + Redux Toolkit)

The frontend is a React 19 single-page app built with Vite and TypeScript. State lives in a Redux Toolkit store with a one-way data flow: components dispatch actions, reducers update the store, and components read it back through selectors. Each feature keeps its slice, components and styles together under `features/`.

```text
frontend/src/
├── app/                  # store and typed hooks
├── config/               # environment parsing (VITE_API_URL)
├── features/
│   ├── products/         # catalog page
│   │   ├── components/   # product card, detail modal, quantity select
│   │   └── state/        # products slice and types
│   └── checkout/         # checkout flow (entry: checkout-flow.tsx)
│       ├── components/   # modal, progress indicator, order summary, data steps and payment backdrop
│       ├── form/         # fields, validation and the card/customer/shipping validators
│       └── state/        # checkout and payment slices, localStorage storage and the in-memory card session
├── shared/               # axios client, currency formatting, modal and confirm dialog
└── test/                 # Jest setup and test helpers
```

How the pieces fit together:

- **Catalog and product detail.** The catalog is a responsive grid of product cards. Choosing one opens its detail in a modal, so the user keeps the context of the catalog behind it. The modal is a native `<dialog>`, which provides focus trapping and `Esc` handling out of the box, and it is closed with its close button; a stray tap outside it does not discard the selection. Quantity is picked from a short list that goes from 1 up to the available stock, so no input validation is needed, and the pay button is disabled when a product is out of stock.
- **Data access.** The axios client is injected into the store as the thunk extra argument. Only `main.tsx` reads the environment, which lets tests run against a fake client without mocking modules.
- **Layout.** Designed mobile first for a 375×667 viewport using Flexbox and Grid, without hiding overflow. From 768 px the modal places the image beside the product details. Colors and spacing are CSS variables in `index.css`.
- **Checkout flow.** "Pay with credit card" starts a checkout: the product detail closes and a modal opens with a four-step progress indicator: personal info, shipping info, card info and summary. Steps can be visited in any order; a check mark appears only on the complete ones, and the summary opens once the first three are complete. "Next" validates the current step, and the card step also holds the terms checkbox. A compact order summary stays visible beside (desktop) or above (mobile) the form. The summary is a two-layer backdrop: the product on the back layer and, on the elevated front layer, the breakdown calculated by the backend (`GET /api/quote`), the delivery address, the card and the pay button. "Pay" creates the transaction (`POST /api/transactions`) and pays it (`POST /api/transactions/:id/pay`) in one click; the button is disabled while it processes. The card and the acceptance tokens are cleared from memory after every attempt, so the user returns to the card step with fresh tokens. Once the payment is attempted, the modal shows a result view: approved, declined, failed, voided, card not accepted, pending, or unconfirmed when the connection fails and the outcome is unknown. Every result shows the transaction reference and the trace id. "Back to products" clears the checkout and reloads the catalog to show the updated stock; after a rejection "Try another card" returns to the card step (a declined, failed or voided payment starts a new reference); a pending or unconfirmed payment offers "Check status", which reads `GET /api/transactions/:id` and does not reconcile with the gateway. A reload during the result view asks the backend for the transaction again. Closing the modal after typing asks for confirmation. There are no routes: the state lives in the store, so the flow survives a reload. Only non-sensitive data is saved to `localStorage` (modal step, product, quantity, customer and shipping data, installments, last four digits, brand, trace id, reference, transaction id and whether a payment was attempted). The card number, expiry, CVC, holder and acceptance tokens stay in a React context in memory, so after a reload the user re-enters the card and fresh single-use tokens are requested. Every checkout request carries an `X-Trace-Id` generated when the checkout starts.
- **Validators.** Card and shipping validation lives in pure functions that return `null` when the value is valid or an error code otherwise, so the UI decides the message. Card numbers must pass the Luhn check and be Visa or Mastercard; expiry is `MM/YY` and must not be in the past; installments go from 1 to 36.
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
| `GET` | `/api/quote` | Get the amount breakdown (`productId` and `quantity` as query params) calculated by the backend: product, base fee, delivery fee and total (`400` invalid params, `404` product, `409` stock) |
| `POST` | `/api/transactions` | Create a `PENDING` transaction; retrying the same request returns the same transaction (`400` invalid data, `404` product, `409` stock, `422` reference reused with different data) |
| `POST` | `/api/transactions/:id/pay` | Pay a `PENDING` transaction with a card: charges the gateway and answers `200` with the final `status` (`APPROVED`, `DECLINED`, `ERROR`, `VOIDED` or `PENDING`). An approved payment discounts the stock and creates the delivery in one database transaction (`400` invalid data, `404`, `409` not payable or out of stock, `422` card rejected by the gateway, `429` rate limit, `502` gateway) |
| `GET` | `/api/transactions/:id` | Get a transaction and its current `status` (`400` if not a UUID, `404` if it does not exist) |
| `GET` | `/api/payments/acceptance-tokens` | Get fresh acceptance tokens and legal links for the checkout (`502` if the payment gateway fails) |

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
| `THROTTLE_PAY_TTL` | Rate limit window for the pay endpoint, in seconds |
| `THROTTLE_PAY_LIMIT` | Max pay requests per window and client |
| `DB_HOST`, `DB_PORT` | PostgreSQL host and port |
| `DB_USER`, `DB_PASS`, `DB_NAME` | PostgreSQL credentials and database |
| `DB_SSL` | `true` to enable SSL (certificate is verified) |
| `TRUST_PROXY_HOPS` | Number of proxies in front of the API (`0` locally); used to resolve the client IP |
| `BASE_FEE_CENTS` | Base fee added to every purchase, in cents |
| `DELIVERY_FEE_CENTS` | Delivery fee added to every purchase, in cents |
| `PAYMENT_API_URL` | Base URL of the payment gateway (`http` or `https`, no trailing path) |
| `PAYMENT_PUBLIC_KEY` | Merchant public key, used only server side and never logged or returned |
| `PAYMENT_PRIVATE_KEY` | Merchant private key used to create and poll charges; server side only |
| `PAYMENT_INTEGRITY_KEY` | Secret used to sign every charge; server side only |
| `PAYMENT_CURRENCY` | ISO 4217 currency code of the charges (for example `COP`) |

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

The payment gateway sandbox documents two test cards. Use any future expiry date and any 3-digit CVC.

| Card number | Brand | Result |
| :--- | :--- | :--- |
| `4242 4242 4242 4242` | Visa | `APPROVED` |
| `4111 1111 1111 1111` | Visa | `DECLINED` |

Any other card number is not accepted by the sandbox: the API answers `422` with `CARD_REJECTED` and the checkout asks the user to enter another card.

The checkout detects Visa and Mastercard while the number is typed (logo and validation), but the sandbox has no Mastercard test card: Mastercard numbers pass the checkout validation and are then rejected by the gateway, so only the two cards above can complete a payment.

---

## 8. AI assistants usage

_Pending._
