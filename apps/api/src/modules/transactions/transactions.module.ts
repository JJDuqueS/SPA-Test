import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { CreateTransactionUseCase } from "./application/create-transaction.use-case";
import { ListTransactionsUseCase } from "./application/list-transactions.use-case";
import { UpdateTransactionUseCase } from "./application/update-transaction.use-case";
import { PrismaTransactionsRepository } from "./adapters/prisma-transactions.repository";
import { TransactionsController } from "./transactions.controller";
import { TRANSACTIONS_PORT } from "./ports/transactions.port";

@Module({
  imports: [PrismaModule],
  controllers: [TransactionsController],
  providers: [
    PrismaTransactionsRepository,
    {
      provide: TRANSACTIONS_PORT,
      useExisting: PrismaTransactionsRepository,
    },
    CreateTransactionUseCase,
    ListTransactionsUseCase,
    UpdateTransactionUseCase,
  ],
})
export class TransactionsModule {}
