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
