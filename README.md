# SPA-Test

## Estructura TODO
checkout-demo/
  apps/
    web/        # React
    api/        # NestJS
  packages/
    shared/     # types (zod schemas, dtos), helpers Result
  docker/
  README.md
  docker-compose.yml

## Comandos:

### npm run start

## Data model design (PostgreSQL / Prisma)

- Product: catalog items with priceCents, stock, imageUrl.
- Customer: buyer identity (fullName, email, phone).
- Delivery: address data plus feeCents, linked to Customer.
- Transaction: payment intent with reference, status, amountCents, baseFeeCents,
  card metadata, linked to Customer and Delivery.
- TransactionItem: line items for a Transaction (productId, quantity, priceCents,
  snapshot name/image).
  
# Fullstack Checkout Demo (SPA)

Este proyecto es una **Single Page Application (SPA)** que implementa un flujo completo de checkout y pago de productos, desde la selección hasta la confirmación final de la transacción, incluyendo control de stock y manejo de errores.

Fue desarrollado como **prueba técnica backend-oriented**, pero con un frontend funcional y testeado, y está pensado para ser parte de mi **portafolio personal**, reflejando decisiones reales de arquitectura, testing y diseño de sistemas.

---

## 🧩 Descripción general

El sistema permite:

1. Listar y seleccionar productos con stock disponible.
2. Ingresar información de tarjeta (fake pero válida) y datos de entrega.
3. Mostrar un resumen de pago (producto + fees).
4. Procesar el pago (simulado).
5. Mostrar el estado final de la transacción y actualizar el stock.

El flujo es **resiliente a refresh**, recuperando el progreso del usuario cuando es posible.

---

## 🛠️ Stack tecnológico

### Frontend
- **React + TypeScript**
- **Vite**
- **TailwindCSS**
- **Redux Toolkit**
- **redux-persist**
- **Vitest** (tests unitarios)

### Backend
- **NestJS**
- **TypeScript**
- **PostgreSQL**
- **Prisma ORM (v7, usando `prisma.config.ts`)**
- **Jest** (tests unitarios)

---

## 🏗️ Arquitectura

### Backend
El backend sigue una aproximación **Hexagonal (Ports & Adapters)** con énfasis en:

- Controllers delgados (solo transporte HTTP).
- Lógica de negocio encapsulada en **Use Cases**.
- Servicios de infraestructura (Prisma) desacoplados.
- Manejo consistente de errores.
- Casos de uso testeados de forma aislada.

También se aplica una aproximación inspirada en **Railway Oriented Programming (ROP)**:
- Las transiciones de estado son explícitas.
- Los flujos de error están modelados y testeados.
- Los casos inválidos se detienen temprano.

### Frontend
Aunque el enfoque principal es backend, el frontend también mantiene una separación clara:
- Redux slices como lógica de estado pura.
- Helpers de checkout testeados como funciones determinísticas.
- Componentes UI simples, sin lógica de negocio compleja.

---

## 💳 Simulación de pagos (nota importante)

Dentro de los requerimientos se proporcionaron credenciales para consumir la **API Sandbox de Wompi**.

Se intentó realizar la integración real:
- Se revisó la documentación oficial.
- Se configuraron las credenciales proporcionadas.
- Se intentó validar el flujo completo.

Sin embargo, **no fue posible completar la integración**, ya que las credenciales de sandbox no respondían correctamente. Se intentó contactar por correo para confirmar el acceso, pero no se obtuvo respuesta.

### Decisión tomada

En lugar de bloquear el proyecto, se diseñó una **capa de simulación de pagos**, con las siguientes características:

- Mantiene la **estructura real** de una respuesta de proveedor.
- Es **determinística** (ideal para tests).
- Incluye **fallback automático** cuando el backend de pagos falla.
- Permite simular estados `APPROVED`, `DECLINED` y `ERROR`.

Esta decisión fue tomada de forma consciente, priorizando:
- Robustez del sistema.
- Testabilidad.
- Claridad del flujo de negocio.

---

## 🔄 Flujo de negocio (alto nivel)

1. `GET /products` – listar productos.
2. `POST /checkout/start` – crea transacción `PENDING`.
3. Simulación de pago (o backend real si estuviera disponible).
4. `POST /checkout/pay` – actualiza la transacción.
5. Actualización de stock solo en caso `APPROVED`.

---

## 🧪 Estrategia de testing

### Backend
- Tests unitarios con **Jest**.
- Controllers testeados con servicios mockeados.
- Use cases testeados como lógica pura.
- Cobertura de:
  - Casos felices
  - Casos de error
  - Invariantes de dominio (estados, stock, transiciones)

### Frontend
- Redux slices testeados como reducers puros.
- Helpers de checkout testeados como lógica de negocio.
- Tests de fallback ante errores de red.
- Un test de flujo de navegación (checkout completo).

### Cobertura
- Backend: **>80%**
- Frontend: **>80%**

> El objetivo no fue maximizar el número de tests, sino cubrir **comportamientos críticos del dominio**.

---

## ▶️ Cómo correr el proyecto localmente

### Backend
```bash
cd apps/api
npm install
npm run prisma:migrate
npm run prisma:seed
npm run start:dev
