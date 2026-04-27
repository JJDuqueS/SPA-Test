# Fullstack Checkout Demo (SPA)

A **Single Page Application (SPA)** that implements an end‑to‑end checkout and payment flow, from product selection to final transaction confirmation, including stock control and error handling.

This project was built as a **backend‑oriented technical challenge**, while still delivering a fully functional and tested frontend. It reflects real‑world architectural decisions, testing strategies, and system design trade‑offs.

---

## 📁 Monorepo Structure

```text
checkout-demo/
  apps/
    web/        # React SPA (Frontend)
    api/        # NestJS API (Backend)
  packages/
    shared/     # Shared types, Zod schemas, DTOs, Result helpers
  docker/
  docker-compose.yml
  README.md
```

---

## ▶️ Getting Started

### Install the project

```bash
npm run install
```
> This command installs the required packages in both the frontend and backend.

### Run the project

```bash
npm run start
```

> This command boots the required services using Docker and starts both the frontend and backend.

---

## 🧠 Domain & Data Model (PostgreSQL + Prisma)

The data model was designed to closely represent a real checkout domain while keeping the scope focused.

### Core entities

- **Product**
  - Catalog items
  - `priceCents`, `stock`, `imageUrl`

- **Customer**
  - Buyer identity
  - `fullName`, `email`, `phone`

- **Delivery**
  - Shipping and address information
  - `feeCents`
  - Linked to a `Customer`

- **Transaction**
  - Payment intent
  - `reference`, `status`, `amountCents`, `baseFeeCents`
  - Card metadata snapshot
  - Linked to `Customer` and `Delivery`

- **TransactionItem**
  - Line items within a transaction
  - `productId`, `quantity`, `priceCents`
  - Snapshot of product `name` and `image`

> Stock updates are only applied after an **APPROVED** transaction.

---

## 🧩 Functional Overview

The system allows a user to:

1. Browse available products with real stock visibility.
2. Enter credit card (fake but structurally valid) and delivery information.
3. Review a payment summary (product + base fee + delivery fee).
4. Execute a simulated payment.
5. View the final transaction result and updated stock.

The checkout flow is **resilient to page refreshes**, restoring progress whenever possible.

---

## 🛠️ Technology Stack

### Frontend

- **React + TypeScript**
- **Vite**
- **Tailwind CSS**
- **Redux Toolkit**
- **redux-persist**
- **Vitest** (unit tests)

### Backend

- **NestJS**
- **TypeScript**
- **PostgreSQL**
- **Prisma ORM (v7, using `prisma.config.ts`)**
- **Jest** (unit tests)

---

## 🏗️ Architecture Decisions

### Backend Architecture

The backend follows a **Hexagonal Architecture (Ports & Adapters)** approach:

- Thin controllers responsible only for HTTP transport.
- Business logic encapsulated in **Use Cases**.
- Infrastructure concerns (Prisma, external services) isolated behind adapters.
- Explicit and consistent error handling.
- Use cases tested in isolation.

Additionally, the system is inspired by **Railway Oriented Programming (ROP)**:

- Explicit state transitions.
- Early exit on invalid states.
- Errors modeled as part of the flow rather than exceptions.

### Frontend Architecture

Although the focus is backend‑heavy, the frontend maintains clear separation of concerns:

- Redux slices implemented as pure state logic.
- Checkout helpers written as deterministic, testable functions.
- UI components kept intentionally simple, with minimal business logic.

---

## 💳 Payment Simulation (Important Note)

As part of the original requirements, sandbox credentials were provided to integrate with the **Wompi API**.

Attempts were made to complete a real integration:

- Official documentation was reviewed.
- Provided sandbox credentials were configured.
- The full payment flow was implemented and tested.

However, the sandbox credentials did not respond correctly, and no confirmation was received after attempting to contact support.

### Design Decision

Rather than blocking the project, a **payment simulation layer** was implemented:

- Mimics the real structure of a payment provider response.
- Fully deterministic and test‑friendly.
- Automatic fallback when the external provider fails.
- Supports `APPROVED`, `DECLINED`, and `ERROR` scenarios.

This decision prioritizes:

- System robustness
- Testability
- Clear business flow representation

---

## 🔄 Business Flow (High Level)

1. `GET /products` – List available products.
2. `POST /checkout/start` – Create a `PENDING` transaction.
3. Execute payment simulation (or real provider if available).
4. `POST /checkout/pay` – Update transaction state.
5. Update product stock only if transaction is `APPROVED`.

---

## 🧪 Testing Strategy

### Backend

- Unit tests with **Jest**.
- Controllers tested with mocked services.
- Use cases tested as pure business logic.
- Coverage includes:
  - Happy paths
  - Error cases
  - Domain invariants (state transitions, stock rules)

### Frontend

- Redux slices tested as pure reducers.
- Checkout helpers tested as deterministic logic.
- Network error fallback tests.
- One end‑to‑end navigation flow test for the full checkout.

### Coverage

- **Backend**: > 80%
- **Frontend**: > 80%

> The goal was not to maximize test count, but to cover **critical domain behavior**.

---

## 🧪 Development Utilities

### Prisma

```bash
npm run prisma:migrate
npm run prisma:seed
```

### Backend (development mode)

```bash
cd apps/api
npm install
npm run start:dev
```

---

## 📌 Notes

- Product creation endpoints were intentionally omitted; products are seeded.
- Credit card data is **never persisted** beyond simulated metadata.
- The project avoids vendor‑specific naming and keeps providers abstracted.

---

## ✅ Summary

This project demonstrates:

- A realistic checkout domain modeled with care.
- Backend‑first architecture with strong separation of concerns.
- Deterministic and resilient payment handling.
- High‑value testing focused on domain behavior.

It is designed to be easy to reason about, easy to test, and easy to extend.

