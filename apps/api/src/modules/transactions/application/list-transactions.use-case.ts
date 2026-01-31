import { Inject, Injectable } from "@nestjs/common";
import { ok, type Result } from "../../../common/rop/result";
import {
  TRANSACTIONS_PORT,
  type TransactionListItem,
  type TransactionsPort,
} from "../ports/transactions.port";
import { TransactionError } from "./transaction.errors";

@Injectable()
export class ListTransactionsUseCase {
  constructor(
    @Inject(TRANSACTIONS_PORT)
    private readonly transactions: TransactionsPort
  ) {}

  async execute(): Promise<Result<TransactionListItem[], TransactionError>> {
    const rows = await this.transactions.listTransactions();
    return ok(rows);
  }
}
