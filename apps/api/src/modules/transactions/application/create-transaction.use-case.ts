import { Inject, Injectable } from "@nestjs/common";
import { randomBytes } from "node:crypto";
import { err, ok, type Result } from "../../../common/rop/result";
import { CreateTransactionDto } from "../dto/create-transaction.dto";
import {
  TRANSACTIONS_PORT,
  type ProductSnapshot,
  type TransactionItemSnapshot,
  type TransactionStatusValue,
  type TransactionsPort,
} from "../ports/transactions.port";
import { TransactionError } from "./transaction.errors";

type NormalizedItem = {
  productId: string;
  name: string;
  priceCents: number;
  quantity: number;
  imageUrl?: string;
};

type NormalizedCreatePayload = {
  items: NormalizedItem[];
  amountCents: number;
  baseFeeCents: number;
  deliveryFeeCents: number;
  customer: {
    fullName: string;
    email: string;
    phone?: string;
  };
  delivery: {
    addressLine1: string;
    city: string;
    state?: string;
    postalCode?: string;
    notes?: string;
  };
  cardBrand?: string;
  cardLast4?: string;
};

type CreateTransactionResult = {
  id: string;
  reference: string;
  status: TransactionStatusValue;
};

@Injectable()
export class CreateTransactionUseCase {
  constructor(
    @Inject(TRANSACTIONS_PORT)
    private readonly transactions: TransactionsPort
  ) {}

  async execute(
    payload: CreateTransactionDto
  ): Promise<Result<CreateTransactionResult, TransactionError>> {
    const validated = validateCreatePayload(payload);
    if (!validated.ok) return validated;

    const {
      items,
      amountCents,
      baseFeeCents,
      deliveryFeeCents,
      customer,
      delivery,
      cardBrand,
      cardLast4,
    } = validated.value;

    const normalizedItems = aggregateItems(items);
    const productIds = normalizedItems.map((item) => item.productId);
    const products = await this.transactions.findProductsByIds(productIds);

    const productMap = new Map(products.map((product) => [product.id, product]));
    const missing = productIds.filter((id) => !productMap.has(id));
    if (missing.length > 0) {
      return err({ type: "ProductNotFound", productIds: missing });
    }

    const insufficient = getInsufficientStock(normalizedItems, productMap);
    if (insufficient.length > 0) {
      return err({ type: "InsufficientStock", items: insufficient });
    }

    const expectedAmount = calculateExpectedAmount(
      normalizedItems,
      productMap,
      baseFeeCents,
      deliveryFeeCents
    );
    if (expectedAmount !== amountCents) {
      return err({
        type: "AmountMismatch",
        expected: expectedAmount,
        actual: amountCents,
      });
    }

    const reference = createReference();
    const persistedItems = normalizedItems.map((item) => {
      const product = productMap.get(item.productId)!;
      const imageUrl = product.imageUrl ?? item.imageUrl ?? null;
      return {
        productId: product.id,
        name: product.name,
        imageUrl,
        priceCents: product.priceCents,
        quantity: item.quantity,
      } satisfies TransactionItemSnapshot;
    });

    const created = await this.transactions.createTransaction({
      reference,
      status: "PENDING",
      amountCents,
      baseFeeCents,
      deliveryFeeCents,
      cardBrand,
      cardLast4,
      primaryProductId: normalizedItems[0].productId,
      customer: {
        fullName: customer.fullName,
        email: customer.email,
        phone: customer.phone ?? null,
      },
      delivery: {
        addressLine1: delivery.addressLine1,
        city: delivery.city,
        state: delivery.state ?? null,
        postalCode: delivery.postalCode ?? null,
        notes: delivery.notes ?? null,
      },
      items: persistedItems,
    });

    return ok({
      id: created.id,
      reference: created.reference,
      status: created.status,
    });
  }
}

const validateCreatePayload = (
  payload: CreateTransactionDto
): Result<NormalizedCreatePayload, TransactionError> => {
  const details: string[] = [];
  const rawItems = Array.isArray(payload?.items) ? payload.items : [];

  if (rawItems.length === 0) {
    details.push("items must include at least one item");
  }

  const items: NormalizedItem[] = rawItems.map((item) => ({
    productId: String(item?.productId ?? "").trim(),
    name: String(item?.name ?? "").trim(),
    priceCents: Number(item?.priceCents ?? 0),
    quantity: Number(item?.quantity ?? 0),
    imageUrl: item?.imageUrl ? String(item.imageUrl).trim() : undefined,
  }));

  if (items.length === 0) {
    details.push("items.productId is required");
  }

  items.forEach((item, index) => {
    if (!item.productId) details.push(`items[${index}].productId is required`);
    if (!item.name) details.push(`items[${index}].name is required`);
    if (!Number.isFinite(item.priceCents) || item.priceCents <= 0) {
      details.push(`items[${index}].priceCents must be > 0`);
    }
    if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
      details.push(`items[${index}].quantity must be > 0`);
    }
  });

  const amountCents = Number(payload?.amountCents ?? 0);
  const baseFeeCents = Number(payload?.baseFeeCents ?? 0);
  const deliveryFeeCents = Number(payload?.deliveryFeeCents ?? 0);

  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    details.push("amountCents must be > 0");
  }
  if (!Number.isFinite(baseFeeCents) || baseFeeCents < 0) {
    details.push("baseFeeCents must be >= 0");
  }
  if (!Number.isFinite(deliveryFeeCents) || deliveryFeeCents < 0) {
    details.push("deliveryFeeCents must be >= 0");
  }

  const fullName = String(payload?.customer?.fullName ?? "").trim();
  const email = String(payload?.customer?.email ?? "").trim();
  const phone = payload?.customer?.phone
    ? String(payload.customer.phone).trim()
    : undefined;

  if (!fullName) details.push("customer.fullName is required");
  if (!email || !email.includes("@")) details.push("customer.email is invalid");

  const addressLine1 = String(payload?.delivery?.addressLine1 ?? "").trim();
  const city = String(payload?.delivery?.city ?? "").trim();
  const state = payload?.delivery?.state
    ? String(payload.delivery.state).trim()
    : undefined;
  const postalCode = payload?.delivery?.postalCode
    ? String(payload.delivery.postalCode).trim()
    : undefined;
  const notes = payload?.delivery?.notes
    ? String(payload.delivery.notes).trim()
    : undefined;

  if (!addressLine1) details.push("delivery.addressLine1 is required");
  if (!city) details.push("delivery.city is required");

  if (details.length > 0) {
    return err({ type: "InvalidPayload", details });
  }

  return ok({
    items,
    amountCents,
    baseFeeCents,
    deliveryFeeCents,
    customer: {
      fullName,
      email,
      phone,
    },
    delivery: {
      addressLine1,
      city,
      state,
      postalCode,
      notes,
    },
    cardBrand: payload?.cardBrand ? String(payload.cardBrand).trim() : undefined,
    cardLast4: payload?.cardLast4 ? String(payload.cardLast4).trim() : undefined,
  });
};

const aggregateItems = (items: NormalizedItem[]): NormalizedItem[] => {
  const grouped = new Map<string, NormalizedItem>();
  for (const item of items) {
    const existing = grouped.get(item.productId);
    if (existing) {
      existing.quantity += item.quantity;
    } else {
      grouped.set(item.productId, { ...item });
    }
  }
  return Array.from(grouped.values());
};

const getInsufficientStock = (
  items: NormalizedItem[],
  productMap: Map<string, ProductSnapshot>
) => {
  const insufficient: Array<{
    productId: string;
    requested: number;
    available: number;
  }> = [];

  for (const item of items) {
    const product = productMap.get(item.productId);
    if (!product) continue;
    if (product.stock < item.quantity) {
      insufficient.push({
        productId: item.productId,
        requested: item.quantity,
        available: product.stock,
      });
    }
  }

  return insufficient;
};

const calculateExpectedAmount = (
  items: NormalizedItem[],
  productMap: Map<string, ProductSnapshot>,
  baseFeeCents: number,
  deliveryFeeCents: number
) =>
  items.reduce((sum, item) => {
    const product = productMap.get(item.productId);
    if (!product) return sum;
    return sum + product.priceCents * item.quantity;
  }, 0) +
  baseFeeCents +
  deliveryFeeCents;

const createReference = () =>
  `REF-${randomBytes(3).toString("hex").toUpperCase()}`;
