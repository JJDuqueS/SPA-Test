export type TransactionError =
  | { type: "InvalidPayload"; details: string[] }
  | { type: "ProductNotFound"; productIds: string[] }
  | {
      type: "InsufficientStock";
      items: Array<{ productId: string; requested: number; available: number }>;
    }
  | { type: "AmountMismatch"; expected: number; actual: number }
  | { type: "TransactionNotFound"; transactionId: string }
  | { type: "InvalidStatus"; status: string }
  | { type: "NothingToUpdate" };
