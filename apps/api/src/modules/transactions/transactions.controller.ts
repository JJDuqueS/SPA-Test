import {
  BadRequestException,
  ConflictException,
  Controller,
  NotFoundException,
  Param,
  Patch,
  Post,
  Get,
  Body,
} from "@nestjs/common";
import { CreateTransactionDto } from "./dto/create-transaction.dto";
import { UpdateTransactionDto } from "./dto/update-transaction.dto";
import { CreateTransactionUseCase } from "./application/create-transaction.use-case";
import { UpdateTransactionUseCase } from "./application/update-transaction.use-case";
import { ListTransactionsUseCase } from "./application/list-transactions.use-case";
import { TransactionError } from "./application/transaction.errors";

@Controller("transactions")
export class TransactionsController {
  constructor(
    private readonly createTransaction: CreateTransactionUseCase,
    private readonly updateTransaction: UpdateTransactionUseCase,
    private readonly listTransactions: ListTransactionsUseCase
  ) {}

  @Get()
  async list() {
    const result = await this.listTransactions.execute();
    if (!result.ok) throw mapError(result.error);
    return result.value;
  }

  @Post()
  async create(@Body() payload: CreateTransactionDto) {
    const result = await this.createTransaction.execute(payload);
    if (!result.ok) throw mapError(result.error);
    return result.value;
  }

  @Patch(":id")
  async update(
    @Param("id") transactionId: string,
    @Body() payload: UpdateTransactionDto
  ) {
    const result = await this.updateTransaction.execute(transactionId, payload);
    if (!result.ok) throw mapError(result.error);
    return result.value;
  }
}

const mapError = (error: TransactionError) => {
  switch (error.type) {
    case "InvalidPayload":
      return new BadRequestException({
        message: "Invalid transaction payload",
        details: error.details,
      });
    case "ProductNotFound":
      return new NotFoundException({
        message: "Product not found",
        productIds: error.productIds,
      });
    case "InsufficientStock":
      return new ConflictException({
        message: "Insufficient stock",
        items: error.items,
      });
    case "AmountMismatch":
      return new BadRequestException({
        message: "Amount mismatch",
        expected: error.expected,
        actual: error.actual,
      });
    case "TransactionNotFound":
      return new NotFoundException({
        message: "Transaction not found",
        transactionId: error.transactionId,
      });
    case "InvalidStatus":
      return new BadRequestException({
        message: "Invalid transaction status",
        status: error.status,
      });
    case "NothingToUpdate":
      return new BadRequestException({
        message: "No fields provided to update",
      });
    default:
      return new BadRequestException("Transaction request failed");
  }
};
