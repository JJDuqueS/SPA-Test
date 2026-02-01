import {
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { ok, err } from "../../../src/common/rop/result";
import { CreateTransactionDto } from "../../../src/modules/transactions/dto/create-transaction.dto";
import { UpdateTransactionDto } from "../../../src/modules/transactions/dto/update-transaction.dto";
import { CreateTransactionUseCase } from "../../../src/modules/transactions/application/create-transaction.use-case";
import { ListTransactionsUseCase } from "../../../src/modules/transactions/application/list-transactions.use-case";
import { UpdateTransactionUseCase } from "../../../src/modules/transactions/application/update-transaction.use-case";
import { TransactionsController } from "../../../src/modules/transactions/transactions.controller";
import type { TransactionListItem } from "../../../src/modules/transactions/ports/transactions.port";

const buildListItem = (
  overrides: Partial<TransactionListItem> = {}
): TransactionListItem => ({
  id: "tx_1",
  reference: "REF-ABC123",
  status: "PENDING",
  amountCents: 1200,
  baseFeeCents: 100,
  deliveryFeeCents: 100,
  cardBrand: null,
  cardLast4: null,
  createdAt: new Date("2025-01-01T00:00:00.000Z"),
  customer: {
    fullName: "Test Customer",
    email: "test@example.com",
    phone: null,
  },
  delivery: {
    addressLine1: "123 Main St",
    city: "Test City",
    state: null,
    postalCode: null,
    notes: null,
    feeCents: 100,
  },
  items: [
    {
      productId: "prod_1",
      name: "Product",
      imageUrl: null,
      priceCents: 500,
      quantity: 2,
    },
  ],
  ...overrides,
});

describe("TransactionsController", () => {
  let controller: TransactionsController;
  type CreateUseCaseMock = jest.Mocked<Pick<CreateTransactionUseCase, "execute">>;
  type UpdateUseCaseMock = jest.Mocked<Pick<UpdateTransactionUseCase, "execute">>;
  type ListUseCaseMock = jest.Mocked<Pick<ListTransactionsUseCase, "execute">>;
  let createTransaction: CreateUseCaseMock;
  let updateTransaction: UpdateUseCaseMock;
  let listTransactions: ListUseCaseMock;

  beforeEach(async () => {
    const createMock: CreateUseCaseMock = {
      execute: jest.fn(),
    };
    const updateMock: UpdateUseCaseMock = {
      execute: jest.fn(),
    };
    const listMock: ListUseCaseMock = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransactionsController],
      providers: [
        { provide: CreateTransactionUseCase, useValue: createMock },
        { provide: UpdateTransactionUseCase, useValue: updateMock },
        { provide: ListTransactionsUseCase, useValue: listMock },
      ],
    }).compile();

    controller = module.get(TransactionsController);
    createTransaction = createMock;
    updateTransaction = updateMock;
    listTransactions = listMock;
  });

  describe("list", () => {
    it("returns the list from the use case", async () => {
      const rows = [buildListItem()];
      listTransactions.execute.mockResolvedValue(ok(rows));

      const result = await controller.list();

      expect(listTransactions.execute).toHaveBeenCalledTimes(1);
      expect(result).toEqual(rows);
    });
  });

  describe("create", () => {
    it("returns the created transaction response", async () => {
      const payload: CreateTransactionDto = {
        items: [
          {
            productId: "prod_1",
            name: "Product",
            priceCents: 500,
            quantity: 2,
          },
        ],
        amountCents: 1200,
        baseFeeCents: 100,
        deliveryFeeCents: 100,
        customer: { fullName: "Test", email: "test@example.com" },
        delivery: { addressLine1: "123 Main St", city: "Test City" },
      };
      const response = { id: "tx_1", reference: "REF-ABC", status: "PENDING" as const };

      createTransaction.execute.mockResolvedValue(ok(response));

      const result = await controller.create(payload);

      expect(createTransaction.execute).toHaveBeenCalledWith(payload);
      expect(result).toEqual(response);
    });

    it("maps InvalidPayload to BadRequestException", async () => {
      const payload: CreateTransactionDto = {
        items: [],
        amountCents: 0,
        baseFeeCents: 0,
        deliveryFeeCents: 0,
        customer: { fullName: "", email: "" },
        delivery: { addressLine1: "", city: "" },
      };

      createTransaction.execute.mockResolvedValue(
        err({ type: "InvalidPayload", details: ["items are required"] })
      );

      await expect(controller.create(payload)).rejects.toBeInstanceOf(
        BadRequestException
      );
    });
  });

  describe("update", () => {
    it("returns the updated transaction response", async () => {
      const payload: UpdateTransactionDto = { provider: "stripe" };
      const response = { id: "tx_1", status: "PENDING" as const };

      updateTransaction.execute.mockResolvedValue(ok(response));

      const result = await controller.update("tx_1", payload);

      expect(updateTransaction.execute).toHaveBeenCalledWith("tx_1", payload);
      expect(result).toEqual(response);
    });

    it("maps TransactionNotFound to NotFoundException", async () => {
      updateTransaction.execute.mockResolvedValue(
        err({ type: "TransactionNotFound", transactionId: "tx_1" })
      );

      await expect(controller.update("tx_1", {})).rejects.toBeInstanceOf(
        NotFoundException
      );
    });
  });
});
