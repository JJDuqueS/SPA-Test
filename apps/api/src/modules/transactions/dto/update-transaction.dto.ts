import { TransactionStatusValue } from "../ports/transactions.port";

export class UpdateTransactionDto {
  status?: TransactionStatusValue;
  provider?: string | null;
  providerTxId?: string | null;
  cardBrand?: string | null;
  cardLast4?: string | null;
}
