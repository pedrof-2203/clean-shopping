# Clean Shopping

A TypeScript e-commerce API built with NestJS, demonstrating layered architecture, DDD concepts, CQRS, interchangeable product repositories, and Stripe Checkout.

## Overview

The API manages products, customers, orders, and payments. It supports customer registration, catalog queries, order fulfillment, hosted checkout, and email notifications triggered by business events. This backend provides a practical architecture example for portfolio review and study; it contains no storefront or administrative UI.

## Architecture

Controllers dispatch commands and queries through NestJS `CommandBus` and `QueryBus`. Application handlers coordinate domain objects through repository and integration interfaces. Nest module providers bind symbol tokens to concrete infrastructure adapters. Repositories map database records to domain objects through `reconstitute` factories; response DTOs separately map domain objects to JSON.

```text
src/
├── main.ts                       # Bootstrap, validation, exception filters
├── app.module.ts                 # Composition and environment configuration
├── product/
│   ├── presentation/             # HTTP controller and DTOs
│   ├── application/              # Commands, queries, handlers, repository port
│   ├── domain/                   # Aggregate and value objects
│   └── infrastructure/adapters/  # PostgreSQL and MongoDB repositories
├── customer/                     # Same layers; registration and notifications
├── order/                        # Same layers; lifecycle events and saga
├── payment/                      # Same layers; checkout and confirmation
│   └── ports/                    # Payment gateway contract
└── shared/
    ├── domain/                   # Entity, aggregate base, Money, UniqueId, errors
    └── infrastructure/
        ├── database/
        │   ├── mongodb/          # Connection provider
        │   └── postgres/         # Drizzle provider and schemas
        └── filters/              # Domain/application error-to-HTTP mapping
```

Customer, order, and payment aggregates collect events. Handlers persist state before calling `commit()` to publish events. An RxJS saga maps `PaymentCompletedEvent` to `ConfirmOrderCommand`. Events run in process; no broker, event store, or outbox is implemented.

CQRS separates command and query code, but both use the same repositories and persistence models. The domain aggregate base extends NestJS CQRS, so the domain retains that framework dependency.

## Modules

### Products

Creates, lists, retrieves, and physically deletes catalog products. `Product`, `ProductId`, `Sku`, and shared `Money` model product identity, price, stock, and descriptive fields. New products are active with a low-stock threshold of `5`. Creation checks for duplicate SKU and name.

`ProductRepositoryPort` supports active/price filters. `DATABASE=mongodb` selects `MongoProductRepository`; every other value selects `DrizzleProductRepository`. Orders access products through their own existence-checking `ProductPort` adapter.

### Customers

Registers, lists, retrieves, and physically deletes customers. `Customer`, `CustomerId`, and `Email` model contact details. Emails are trimmed, lowercased, validated, and checked for uniqueness.

`CustomerRepositoryPort` uses PostgreSQL. Registration publishes `CustomerRegisteredEvent`, whose handler sends a welcome email through `NotificationPort`. `NodemailerEmailAdapter` is active; a console adapter exists but is not bound in the module. Orders reuse the customer repository and notification service.

### Orders

Places and queries orders and supports confirmation, shipping, delivery, and cancellation. `Order` is an aggregate containing `OrderItem` entities. `OrderId`, `OrderStatus`, `ShippingAddress`, and `Money` enforce domain rules.

Placement checks customer/product existence through `CustomerPort` and `ProductPort`. Product names, prices, currencies, quantities, and discounts come from the request; catalog prices are not fetched, and stock is not checked or decremented.

`OrderRepositoryPort` uses PostgreSQL. Saving an order and its items runs in one Drizzle transaction. Lifecycle events send notifications; confirmation sends shipping instructions to the customer identified by `ADMIN_USER_ID`. The fulfillment saga confirms orders after payment completion.

### Payments

Creates Stripe Checkout sessions and confirms payments from webhooks. `Payment`, `PaymentId`, and `PaymentStatus` model `pending`, `processing`, and `succeeded` states.

The payment repository uses PostgreSQL. `OrderPricingPort` reads totals and line items through an order adapter; `PaymentGatewayPort` is implemented by `StripePaymentAdapter`. Checkout reuses an existing unpaid payment but creates a new session and saves `processing`. Confirmation saves `succeeded` and publishes `PaymentCompletedEvent`. An already-succeeded confirmation returns without publishing again.

### Shared domain and infrastructure

Global MongoDB and Drizzle modules provide connections. `UniqueId` generates UUIDs. `Money` rounds to two decimal places, converts to cents, and checks currency compatibility during arithmetic. Exception filters map domain and application errors to HTTP responses.

## API endpoints

Default base URL: `http://localhost:3000`. There is no route prefix.

**All routes are public.** There is no JWT, session, authorization guard, or ownership check. The webhook requires a valid `stripe-signature` header. Customer registration creates a contact, not authentication credentials.

Send JSON bodies with `Content-Type: application/json`. The global `ValidationPipe` uses `whitelist: true`, stripping undecorated DTO properties. Numeric body fields require JSON numbers. Every `:id` path parameter uses `ParseUUIDPipe`. Lists return arrays without pagination. Except where listed, endpoints have no query parameters or request body.

### Products

| Method | Route | Purpose / inputs | Success | Important errors |
| --- | --- | --- | --- | --- |
| POST | `/products` | Create; body below | `201`, empty body | `400` validation/domain rule; `409` duplicate SKU/name |
| GET | `/products` | List; optional `isActive`, `minPrice`, `maxPrice` | `200`, product array | Invalid price filters can cause persistence errors |
| GET | `/products/:id` | Retrieve by UUID | `200`, product object | `400` invalid UUID; `404` missing product |
| DELETE | `/products/:id` | Physically delete by UUID | `200`, empty body | `400` invalid UUID; `404` missing product; `500` for PostgreSQL foreign-key violations |

```json
{
  "name": "Canvas Backpack",
  "description": "Everyday canvas backpack",
  "sku": "BAG-001",
  "price": 49.9,
  "currency": "USD",
  "stock": 20
}
```

| Field | Validation / behavior |
| --- | --- |
| `name` | Required string, 2–255 characters; duplicate names rejected |
| `description` | Required string; empty string accepted |
| `sku` | Required alphanumeric/hyphen string; DTO permits 3–50 characters and domain requires 4–64, so use 4–50; normalized uppercase |
| `price` | Required number ≥ 0; rounded to two decimals |
| `currency` | Optional three-character string; defaults to `USD`; no currency allowlist |
| `stock` | Required number ≥ 0; use integers for PostgreSQL's integer column, although the DTO does not enforce this |

`GET /products?isActive=true&minPrice=10&maxPrice=100` applies inclusive price bounds in major currency units. Only the literal `true` becomes true; any other supplied `isActive` value becomes false. Price strings use `parseFloat` without query validation.

Product responses contain `id`, `name`, `description`, `sku`, `price`, `currency`, `stock`, `isActive`, `lowStockThreshold`, `createdAt`, and `updatedAt`. Monetary amounts are numbers in major currency units; timestamps are ISO strings.

### Customers

| Method | Route | Purpose / inputs | Success | Important errors |
| --- | --- | --- | --- | --- |
| POST | `/customers` | Register; body below | `201`, empty body | `400` validation/email format; `409` duplicate email |
| GET | `/customers` | List all | `200`, customer array | `500` unhandled persistence failure |
| GET | `/customers/:id` | Retrieve by UUID | `200`, customer object | `400` invalid UUID; `404` missing customer |
| DELETE | `/customers/:id` | Physically delete by UUID | `200`, empty body | `400` invalid UUID; `404` missing customer; `500` when referenced by orders |

```json
{
  "email": "alex@example.com",
  "firstName": "Alex",
  "lastName": "Morgan",
  "phone": "+14155552671"
}
```

`email`, `firstName`, and `lastName` are required, nonempty strings of at most 100 characters. The email value object additionally checks email syntax. `phone` is required by the DTO and must pass `IsPhoneNumber()`; use an international number.

Responses contain `id`, `email`, `firstName`, `lastName`, `fullName`, `phone` (string or null), `createdAt`, and `updatedAt` (ISO strings). Although the DTO declares `isActive`, its mapper never assigns it, so it is omitted from JSON.

### Orders

| Method | Route | Purpose / inputs | Success | Important errors |
| --- | --- | --- | --- | --- |
| POST | `/orders` | Place; body below | `201`, empty body | `400` validation/domain rule; `404` missing customer/product |
| GET | `/orders` | List; optional `customerId` | `200`, order array | Invalid nonempty filter can cause PostgreSQL UUID parsing error (`500`) |
| GET | `/orders/:id` | Retrieve by UUID | `200`, order object | `400` invalid UUID; `404` missing order |
| PATCH | `/orders/:id/confirm` | Confirm pending order; no body | `200`, empty body | `400` UUID/invalid transition; `404` missing order |
| PATCH | `/orders/:id/ship` | Ship confirmed order; tracking body | `200`, empty body | `400` UUID/body/invalid transition; `404` missing order |
| PATCH | `/orders/:id/deliver` | Deliver shipped order; no body | `200`, empty body | `400` UUID/invalid transition; `404` missing order |
| PATCH | `/orders/:id/cancel` | Cancel pending/confirmed order; reason body | `200`, empty body | `400` UUID/reason/invalid transition; `404` missing order |

Replace example IDs with records returned by the customer and product list endpoints:

```json
{
  "customerId": "11111111-1111-4111-8111-111111111111",
  "items": [{
    "productId": "22222222-2222-4222-8222-222222222222",
    "productName": "Canvas Backpack",
    "unitPrice": 49.9,
    "currency": "USD",
    "quantity": 2,
    "discount": 5
  }],
  "shippingStreet": "123 Market Street",
  "shippingCity": "San Francisco",
  "shippingState": "CA",
  "shippingZipCode": "94103",
  "shippingCountry": "US"
}
```

| Field | Validation / behavior |
| --- | --- |
| `customerId` | Required UUID; customer must exist |
| `items` | Required array with at least one nested item |
| `items[].productId` | Required UUID; product must exist |
| `items[].productName` | Required string, 1–255 characters |
| `items[].unitPrice` | Required number ≥ 0, in major currency units |
| `items[].currency` | Optional three-character string; defaults to `USD`; use the same uppercase currency throughout an order |
| `items[].quantity` | Required number ≥ 1; use integers for PostgreSQL and Checkout |
| `items[].discount` | Optional number ≥ 0; absolute discount on the entire line, strictly less than `unitPrice × quantity` |
| Shipping fields | All five required strings; street, city, state, and zip code must be nonblank after trimming; country must have exactly two trimmed characters (no ISO membership lookup) |

The example subtotal and total are `94.8`. `Money.isGreaterThan` currently uses `>=`, so a discount equal to the line total is also rejected.

Shipping body: `{"trackingNumber":"TRACK-001"}`. The DTO requires 1–255 characters; the domain rejects whitespace-only values and trims the number.

Cancellation body: `{"reason":"Customer requested cancellation"}`. A nonblank string is required by the domain. This endpoint has no DTO validation; non-string values can cause `500`. The reason is checked but is not persisted in notes.

Allowed transitions are `pending → confirmed → shipped → delivered`, plus `pending → cancelled` and `confirmed → cancelled`. Manual confirmation does not check payment status. Missing or empty `customerId` returns all orders; a supplied filter has no UUID pipe.

Order responses contain:

- `id`, `customerId`, `status`.
- `items`, each with `id`, `productId`, `productName`, `unitPrice`, `currency`, `quantity`, `discount` (number or null), and `subtotal`.
- `totalAmount`, `totalCurrency`, `itemCount` (sum of quantities).
- `trackingNumber` and `note` (string or null).
- `shippingStreet`, `shippingCity`, `shippingState`, `shippingZipCode`, `shippingCountry`.
- `createdAt` and `updatedAt` as ISO strings.

Amounts use major currency units. Totals contain no tax or shipping charge.

### Payments

| Method | Route | Purpose / inputs | Success | Important errors |
| --- | --- | --- | --- | --- |
| POST | `/payments` | Create Checkout; body below | `201`, `{ "paymentId": "…", "checkoutUrl": "…" }` | `400` validation/nonpositive amount; `404` missing order; `409` already paid; `500` gateway/config failure |
| POST | `/payments/webhook` | Raw Stripe event plus `stripe-signature` header | `201`, empty body | `404` missing payment; `400` invalid payment transition; `500` unhandled signature/config failure |

Neither endpoint takes path or query parameters.

```json
{
  "orderId": "33333333-3333-4333-8333-333333333333",
  "successUrl": "http://localhost:5173/checkout/success",
  "cancelUrl": "http://localhost:5173/checkout/cancel"
}
```

`orderId` is a required UUID. Both URLs are optional and use `IsUrl({ require_tld: false })`, allowing localhost. Omitted `successUrl` falls back to `STRIPE_SUCCESS_URL`; there is no cancellation URL fallback. These example redirect pages must be provided separately.

The controller returns the handler's checkout object at runtime despite declaring `Promise<void>`. Open `checkoutUrl` in a browser. Creating a session does not confirm the order.

The webhook verifies the raw body with `STRIPE_WEBHOOK_SECRET`. Only `checkout.session.completed` is handled. The session must contain `metadata.paymentId` and a `payment_intent` string or object with an `id`; otherwise it is ignored. Other event types are ignored. Payment completion emits the event consumed by the order confirmation saga. Signature errors have no explicit client-error mapping.

### Error format

Domain exceptions return `400`; application validation, not-found, and conflict exceptions return `400`, `404`, and `409`:

```json
{
  "statusCode": 404,
  "message": "Order 33333333-3333-4333-8333-333333333333 not found."
}
```

DTO/UUID pipe responses use NestJS validation formatting and may include an `error` field and message array. Unhandled infrastructure failures return `500`. Foreign-key violations and concurrent unique-constraint failures are not mapped to application conflicts.

## API documentation

Swagger/OpenAPI is not configured; there is no Swagger UI route. This README covers all four controllers and 17 endpoints. No root or health endpoint exists.

## Database

PostgreSQL uses Drizzle ORM and the `postgres` driver. Schemas reside in `src/shared/infrastructure/database/postgres/schema/`. Five SQL migrations and snapshots are committed under `drizzle/`.

| Store | Data / constraints |
| --- | --- |
| PostgreSQL `products` | Catalog; unique SKU; integer cents, stock, and threshold |
| PostgreSQL `customers` | Contact details; unique email |
| PostgreSQL `orders` | Customer foreign key, status enum, total in cents, shipping/tracking |
| PostgreSQL `order_items` | Order/product foreign keys; prices/discounts in cents, integer quantity |
| PostgreSQL `payments` | Order foreign key, status enum, amount in cents, gateway transaction ID |
| MongoDB `products` | Alternative catalog; UUID strings as `_id`, amounts in cents |

Both providers connect at startup regardless of `DATABASE`. Customers, orders, and payments always use PostgreSQL. Switching the product adapter does not migrate or synchronize records.

**Use `DATABASE=postgres` for the complete order/payment workflow.** Order items reference PostgreSQL products, so products created only in MongoDB cannot be ordered without matching PostgreSQL rows. No synchronization is implemented.

Deletes are physical; foreign keys do not cascade. There are no seeds, MongoDB migrations, or automatic startup migrations. On a populated legacy database, migration `0001` adds a non-null description without a default and may require a data backfill.

## Environment variables

NestJS loads `.env` through `ConfigModule`. `.env.example` lists integration settings; `PORT` is additionally read in `main.ts`. There is no environment validation schema.

| Variable | Purpose / default | Required |
| --- | --- | --- |
| `PORT` | HTTP port; default `3000` | No |
| `DATABASE` | Product adapter: exactly `mongodb`, otherwise PostgreSQL | No; use `postgres` for full workflow |
| `MONGODB_URI` | MongoDB connection URI | At startup, for either adapter |
| `MONGODB_DB_NAME` | MongoDB database; default `clean_shopping` | No |
| `POSTGRES_DATABASE_URL` | PostgreSQL URL for application and Drizzle Kit | At startup and for migrations |
| `SMTP_HOST` | SMTP hostname | At startup |
| `SMTP_PORT` | SMTP port | At startup |
| `SMTP_USER` | SMTP authentication username | At startup |
| `SMTP_PASSWORD` | SMTP authentication password | At startup |
| `SMTP_FROM` | Sender address | At startup |
| `ADMIN_USER_ID` | Existing customer UUID receiving shipment instructions | On order confirmation |
| `STRIPE_SECRET_KEY` | Stripe API secret; use test mode locally | At startup |
| `STRIPE_WEBHOOK_SECRET` | Webhook/listener signing secret | For webhook processing |
| `STRIPE_SUCCESS_URL` | Success redirect fallback | When request omits `successUrl` |

Use your own integration settings. `ADMIN_USER_ID` is a customer ID, not an email address or authorization role.

## Running the project

### 1. Prerequisites

- Node.js 20.19+ (required by the installed MongoDB driver); build verified with Node.js 24.16.0.
- pnpm: the repository contains `pnpm-lock.yaml` and `pnpm-workspace.yaml`, without a pinned `packageManager` version.
- Docker with Compose for databases.
- An authenticated SMTP service and Stripe test-mode secret key. Both providers are instantiated even for catalog-only usage.
- Stripe CLI for local webhook testing.

### 2. Clone and install

```bash
git clone https://github.com/pedrof-2203/clean-shopping.git
cd clean-shopping
pnpm install --frozen-lockfile
```

### 3. Configure `.env`

Copy `.env.example` to `.env` using `cp .env.example .env` in Bash or `Copy-Item .env.example .env` in PowerShell. Preserve an existing configured `.env`.

For Compose, set `MONGODB_URI=mongodb://localhost:27017`, `MONGODB_DB_NAME=clean_shopping`, and `DATABASE=postgres`. Build the PostgreSQL URL from the local development values defined in `docker-compose.yml`:

```dotenv
POSTGRES_DATABASE_URL=postgresql://<POSTGRES_USER>:<POSTGRES_PASSWORD>@localhost:5432/clean_shopping
```

Replace placeholders with the corresponding Compose values. Populate all SMTP settings, `STRIPE_SECRET_KEY`, and a success redirect URL. Set `ADMIN_USER_ID` after registering a customer in step 6; obtain the webhook secret from the listener described below.

### 4. Start databases and migrate

```bash
docker compose up -d
docker compose ps
docker compose logs postgres mongodb
node --env-file=.env node_modules/drizzle-kit/bin.cjs migrate
```

Wait until both databases accept connections. Compose defines no health checks. The explicit Node `--env-file` loads configuration because `drizzle.config.ts` reads `process.env` without loading `.env` itself.

For future schema changes:

```bash
node --env-file=.env node_modules/drizzle-kit/bin.cjs generate
```

These commands invoke the installed Drizzle Kit CLI; no migration scripts or seed command exist in `package.json`.

### 5. Start the application

```bash
pnpm run start:dev
```

Access `http://localhost:3000/products`. `GET /` returns `404`. To run compiled output:

```bash
pnpm run build
pnpm run start:prod
```

### 6. Exercise the workflow

1. Register a customer using `POST /customers` with an address accessible through your SMTP test setup.
2. Read `GET /customers` for the UUID. Set an existing customer's UUID as `ADMIN_USER_ID` and restart the API.
3. Create a product and retrieve its UUID from `GET /products`.
4. Place an order with those IDs and obtain its UUID from `GET /orders?customerId=<customer-uuid>`. Creation responses for products, customers, and orders do not return IDs.
5. Configure webhook forwarding, call `POST /payments`, open `checkoutUrl`, and complete a Stripe test payment.
6. Read the order to observe confirmation, then call ship and deliver. Manual confirmation can be exercised on a separate pending order.

## External integrations

### Stripe Checkout and webhooks

Checkout uses `mode: payment`, order item names, quantities, and effective unit prices. Discounts are divided across quantity and rounded to cents, which can produce differences between stored totals and Checkout totals. Session metadata contains `orderId` and `paymentId`.

For local forwarding:

```bash
stripe login
stripe listen --events checkout.session.completed --forward-to localhost:3000/payments/webhook
```

Set the listener's signing secret as `STRIPE_WEBHOOK_SECRET`, restart the API, and keep the listener running while completing the session created by this API. Use the same Stripe account/test environment for the CLI and API. A generic event without matching payment metadata will not confirm your order.

Failure, expiration, refund, and asynchronous payment event flows are not implemented.

### SMTP notifications

Nodemailer sends HTML email for customer registration and order placement, shipping, delivery, and cancellation. Confirmation emails shipment instructions to `ADMIN_USER_ID`. Every recipient is resolved through the customer repository, so the administrator must already exist as a customer.

Provide an authenticated SMTP account or development mail service through the five SMTP variables. Compose includes no mail service. Event handlers run after persistence, with no durable retry queue or transactional delivery guarantee. Activating the console adapter requires changing the module provider binding.

## Docker

Compose runs infrastructure only. There is no application Dockerfile or application service.

| Service | Image | Host port | Named volume / mount |
| --- | --- | --- | --- |
| `mongodb` | `mongo` (unpinned) | `27017` | `mongodb_data:/data/db` |
| `postgres` | `postgres` (unpinned) | `5432` | `postgres_data:/var/lib/postgresql` |

PostgreSQL's development credentials are defined in Compose. MongoDB has no authentication configured there. The application runs on the host using localhost connections.

```bash
docker compose up -d                  # Start databases
docker compose ps                     # Inspect status
docker compose logs -f postgres mongodb
docker compose down                   # Remove containers; retain named volumes
```

## Tests

Jest and ts-jest are configured, but no unit `*.spec.ts` files exist under `src/`. `pnpm run test --runInBand` reports “No tests found” and exits with code 1. Watch and coverage scripts use the same empty suite.

```bash
pnpm run test
pnpm run test:watch
pnpm run test:cov
pnpm run test:e2e
```

The only test, `test/app.e2e-spec.ts`, uses Supertest and the full `AppModule`. It still expects `GET /` to return `Hello World!`, although that route no longer exists. It initializes real infrastructure providers and does not reproduce the global pipes/filters in `main.ts`. It is a stale starter test, not verification of the business workflow. No separate integration suite exists.

## Available scripts

| Command | Purpose |
| --- | --- |
| `pnpm run build` | Compile with Nest CLI into `dist/` |
| `pnpm run format` | Rewrite TypeScript formatting in `src/` and `test/` |
| `pnpm run start` | Start with Nest CLI |
| `pnpm run start:dev` | Start in watch mode |
| `pnpm run start:debug` | Start with debugger and watch mode |
| `pnpm run start:prod` | Execute `node dist/main`; build first |
| `pnpm run lint` | Run ESLint with `--fix` on configured source/test paths |
| `pnpm run test` | Run Jest source configuration |
| `pnpm run test:watch` | Run Jest in watch mode |
| `pnpm run test:cov` | Collect coverage into `coverage/` |
| `pnpm run test:debug` | Run Jest serially with Node inspector and ts-node |
| `pnpm run test:e2e` | Run Jest using `test/jest-e2e.json` |

## Tech stack

| Technology | Role |
| --- | --- |
| TypeScript / Node.js | Application language and runtime |
| NestJS 11 / Express | HTTP server, modules, dependency injection, exception handling |
| NestJS CQRS / RxJS | Commands, queries, aggregate events, fulfillment saga |
| NestJS Config | Environment configuration |
| class-validator / class-transformer | Request validation and nested DTO handling |
| Drizzle ORM / Drizzle Kit / postgres | PostgreSQL persistence, schemas, migrations |
| MongoDB native driver | Alternative product persistence |
| Stripe | Checkout and webhook verification |
| Nodemailer | SMTP notifications |
| Docker Compose | Local database services |
| Jest / ts-jest / Supertest | Configured test tooling |
| ESLint / Prettier / pnpm | Code quality, formatting, dependency/script management |

## Design decisions

- **Dependency inversion:** application handlers use ports; module bindings select repositories and integrations.
- **Domain rules:** value objects enforce email/SKU formats, address requirements, monetary operations, and state transitions.
- **Module boundaries:** orders use existence ports; payments use an order-pricing port. Direct dependencies remain: order notification handlers import the customer port, and the customer registration event resides in the product directory.
- **Explicit mapping:** repositories store integer cents while HTTP responses expose major currency units. Reconstitution avoids creation-time event emission when loading records.
- **Event coordination:** a saga links payment success to order confirmation. Database transactions do not cover Stripe calls or event processing.

## Project status

The repository demonstrates architecture and e-commerce workflows with important implementation limits:

- No authentication or authorization; callers can access customer data and alter order state.
- Order prices/names come from clients; inventory is not reserved or decremented.
- MongoDB-only products cannot satisfy the PostgreSQL order-item foreign key.
- Checkout does not validate order status. Repeated unpaid attempts create new sessions; payment `orderId` has no unique constraint.
- Manual confirmation bypasses payment, cancellation does not refund, and shipping has no carrier integration.
- Durable event recovery, automated business tests, Swagger, and production deployment configuration are absent.

The build compiles, but the repository should not be treated as production-ready.
