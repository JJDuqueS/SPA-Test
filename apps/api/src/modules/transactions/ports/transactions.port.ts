export const TRANSACTIONS_PORT = Symbol("TRANSACTIONS_PORT");

export const TRANSACTION_STATUSES = [
  "PENDING",
  "APPROVED",
  "DECLINED",
  "ERROR",
] as const;

export type TransactionStatusValue = (typeof TRANSACTION_STATUSES)[number];

export type ProductSnapshot = {
  id: string;
  name: string;
  imageUrl: string | null;
  priceCents: number;
  stock: number;
};

export type TransactionItemSnapshot = {
  productId: string;
  name: string;
  imageUrl?: string | null;
  priceCents: number;
  quantity: number;
};

export type CreateTransactionPersistence = {
  reference: string;
  status: TransactionStatusValue;
  amountCents: number;
  baseFeeCents: number;
  deliveryFeeCents: number;
  cardBrand?: string;
  cardLast4?: string;
  primaryProductId: string;
  customer: {
    fullName: string;
    email: string;
    phone?: string | null;
  };
  delivery: {
    addressLine1: string;
    city: string;
    state?: string | null;
    postalCode?: string | null;
    notes?: string | null;
  };
  items: TransactionItemSnapshot[];
};

export type TransactionUpdatePersistence = {
  status?: TransactionStatusValue;
  provider?: string | null;
  providerTxId?: string | null;
  cardBrand?: string | null;
  cardLast4?: string | null;
};

export type CreateTransactionRecord = {
  id: string;
  reference: string;
  status: TransactionStatusValue;
};

export type TransactionRecord = {
  id: string;
  status: TransactionStatusValue;
};

export type TransactionWithItems = {
  id: string;
  status: TransactionStatusValue;
  items: TransactionItemSnapshot[];
};

export type TransactionListItem = {
  id: string;
  reference: string;
  status: TransactionStatusValue;
  amountCents: number;
  baseFeeCents: number;
  deliveryFeeCents: number;
  cardBrand?: string | null;
  cardLast4?: string | null;
  createdAt: Date;
  customer: {
    fullName: string;
    email: string;
    phone?: string | null;
  };
  delivery?: {
    addressLine1: string;
    city: string;
    state?: string | null;
    postalCode?: string | null;
    notes?: string | null;
    feeCents: number;
  } | null;
  items: TransactionItemSnapshot[];
};

export interface TransactionsPort {
  findProductsByIds(ids: string[]): Promise<ProductSnapshot[]>;
  createTransaction(
    data: CreateTransactionPersistence
  ): Promise<CreateTransactionRecord>;
  listTransactions(): Promise<TransactionListItem[]>;
  findTransactionWithItems(id: string): Promise<TransactionWithItems | null>;
  updateTransaction(
    id: string,
    data: TransactionUpdatePersistence
  ): Promise<TransactionRecord | null>;
  updateTransactionAndDecrementStock(
    id: string,
    data: TransactionUpdatePersistence,
    adjustments: Array<{ productId: string; quantity: number }>
  ): Promise<TransactionRecord | null>;
}
