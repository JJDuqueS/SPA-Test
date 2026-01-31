import { Inject, Injectable } from "@nestjs/common";
import { err, ok, type Result } from "../../../common/rop/result";
import { UpdateTransactionDto } from "../dto/update-transaction.dto";
import {
  TRANSACTIONS_PORT,
  TRANSACTION_STATUSES,
  type ProductSnapshot,
  type TransactionStatusValue,
  type TransactionsPort,
} from "../ports/transactions.port";
import { TransactionError } from "./transaction.errors";

type NormalizedUpdatePayload = {
  status?: TransactionStatusValue;
  provider?: string | null;
  providerTxId?: string | null;
  cardBrand?: string | null;
  cardLast4?: string | null;
};

type UpdateTransactionResult = {
  id: string;
  status: TransactionStatusValue;
};

@Injectable()
export class UpdateTransactionUseCase {
  constructor(
    @Inject(TRANSACTIONS_PORT)
    private readonly transactions: TransactionsPort
  ) {}

  async execute(
    transactionId: string,
    payload: UpdateTransactionDto
  ): Promise<Result<UpdateTransactionResult, TransactionError>> {
    const validated = validateUpdatePayload(payload);
    if (!validated.ok) return validated;

    const existing = await this.transactions.findTransactionWithItems(
      transactionId
    );
    if (!existing) {
      return err({ type: "TransactionNotFound", transactionId });
    }

    const updates = validated.value;
    const shouldAdjustStock =
      updates.status === "APPROVED" && existing.status !== "APPROVED";

    if (shouldAdjustStock && existing.items.length > 0) {
      const productIds = existing.items.map((item) => item.productId);
      const products = await this.transactions.findProductsByIds(productIds);
      const productMap = new Map(products.map((product) => [product.id, product]));
      const insufficient = getInsufficientStock(existing.items, productMap);
      if (insufficient.length > 0) {
        return err({ type: "InsufficientStock", items: insufficient });
      }

      const adjustments = aggregateAdjustments(existing.items);
      const updated = await this.transactions.updateTransactionAndDecrementStock(
        transactionId,
        updates,
        adjustments
      );
      if (!updated) {
        return err({ type: "TransactionNotFound", transactionId });
      }
      return ok({ id: updated.id, status: updated.status });
    }

    const updated = await this.transactions.updateTransaction(
      transactionId,
      updates
    );
    if (!updated) {
      return err({ type: "TransactionNotFound", transactionId });
    }

    return ok({ id: updated.id, status: updated.status });
  }
}

const normalizeField = (value: unknown): string | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = String(value).trim();
  return trimmed.length === 0 ? null : trimmed;
};

const normalizeStatus = (
  value: unknown
): Result<TransactionStatusValue | undefined, TransactionError> => {
  if (value === undefined) return ok(undefined);
  const normalized = String(value).trim().toUpperCase();
  if (normalized.length === 0) return ok(undefined);
  if (
    !TRANSACTION_STATUSES.includes(normalized as TransactionStatusValue)
  ) {
    return err({ type: "InvalidStatus", status: normalized });
  }
  return ok(normalized as TransactionStatusValue);
};

const validateUpdatePayload = (
  payload: UpdateTransactionDto
): Result<NormalizedUpdatePayload, TransactionError> => {
  const statusResult = normalizeStatus(payload?.status);
  if (!statusResult.ok) return statusResult;

  const updates: NormalizedUpdatePayload = {
    status: statusResult.value,
    provider: normalizeField(payload?.provider),
    providerTxId: normalizeField(payload?.providerTxId),
    cardBrand: normalizeField(payload?.cardBrand),
    cardLast4: normalizeField(payload?.cardLast4),
  };

  const hasUpdate = Object.values(updates).some(
    (value) => value !== undefined
  );
  if (!hasUpdate) return err({ type: "NothingToUpdate" });

  return ok(updates);
};

const aggregateAdjustments = (
  items: Array<{ productId: string; quantity: number }>
) => {
  const grouped = new Map<string, number>();
  for (const item of items) {
    grouped.set(item.productId, (grouped.get(item.productId) ?? 0) + item.quantity);
  }
  return Array.from(grouped.entries()).map(([productId, quantity]) => ({
    productId,
    quantity,
  }));
};

const getInsufficientStock = (
  items: Array<{ productId: string; quantity: number }>,
  productMap: Map<string, ProductSnapshot>
) => {
  const insufficient: Array<{
    productId: string;
    requested: number;
    available: number;
  }> = [];

  const grouped = aggregateAdjustments(items);
  for (const item of grouped) {
    const product = productMap.get(item.productId);
    if (!product) {
      insufficient.push({
        productId: item.productId,
        requested: item.quantity,
        available: 0,
      });
      continue;
    }
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
