import { Test, TestingModule } from "@nestjs/testing";
import { ok } from "../../../src/common/rop/result";
import { UpdateTransactionUseCase } from "../../../src/modules/transactions/application/update-transaction.use-case";
import type { UpdateTransactionDto } from "../../../src/modules/transactions/dto/update-transaction.dto";
import {
  TRANSACTIONS_PORT,
  type ProductSnapshot,
  type TransactionRecord,
  type TransactionWithItems,
  type TransactionsPort,
} from "../../../src/modules/transactions/ports/transactions.port";

describe("UpdateTransactionUseCase", () => {
  let useCase: UpdateTransactionUseCase;
  type TransactionsMock = jest.Mocked<
    Pick<
      TransactionsPort,
      | "findTransactionWithItems"
      | "updateTransaction"
      | "updateTransactionAndDecrementStock"
      | "findProductsByIds"
    >
  >;
  let transactions: TransactionsMock;

  beforeEach(async () => {
    const transactionsMock: TransactionsMock = {
      findTransactionWithItems: jest.fn(),
      updateTransaction: jest.fn(),
      updateTransactionAndDecrementStock: jest.fn(),
      findProductsByIds: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateTransactionUseCase,
        {
          provide: TRANSACTIONS_PORT,
          useValue: transactionsMock,
        },
      ],
    }).compile();

    useCase = module.get(UpdateTransactionUseCase);
    transactions = transactionsMock;
  });

  describe("execute", () => {
    describe("when payload is empty", () => {
      it("returns NothingToUpdate", async () => {
        const result = await useCase.execute("tx_1", {});

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.type).toBe("NothingToUpdate");
        }
      });
    });

    describe("when updating a non-existent transaction", () => {
      it("fails with TransactionNotFound", async () => {
        transactions.findTransactionWithItems.mockResolvedValue(null);

        const result = await useCase.execute("tx_missing", {
          provider: "stripe",
        });

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.type).toBe("TransactionNotFound");
        }
      });

      it("fails with TransactionNotFound if the transaction disappears during update", async () => {
        const existing: TransactionWithItems = {
          id: "tx_1",
          status: "PENDING",
          items: [],
        };

        transactions.findTransactionWithItems.mockResolvedValue(existing);
        transactions.updateTransaction.mockResolvedValue(null);

        const result = await useCase.execute("tx_1", { provider: "stripe" });

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.type).toBe("TransactionNotFound");
        }
      });
    });

    describe("when input is valid", () => {
      it("updates the transaction", async () => {
        const payload: UpdateTransactionDto = { provider: "stripe" };
        const existing: TransactionWithItems = {
          id: "tx_1",
          status: "PENDING",
          items: [],
        };
        const updated: TransactionRecord = { id: "tx_1", status: "PENDING" };

        transactions.findTransactionWithItems.mockResolvedValue(existing);
        transactions.updateTransaction.mockResolvedValue(updated);

        const result = await useCase.execute("tx_1", payload);

        expect(transactions.findTransactionWithItems).toHaveBeenCalledWith("tx_1");
        expect(transactions.updateTransaction).toHaveBeenCalledWith(
          "tx_1",
          expect.objectContaining({ provider: "stripe" })
        );
        expect(result).toEqual(ok(updated));
      });
    });

    describe("when transaction is already APPROVED", () => {
      it("does not decrement stock a second time", async () => {
        const existing: TransactionWithItems = {
          id: "tx_1",
          status: "APPROVED",
          items: [
            {
              productId: "prod_1",
              name: "Product",
              imageUrl: null,
              priceCents: 500,
              quantity: 2,
            },
          ],
        };
        const updated: TransactionRecord = { id: "tx_1", status: "APPROVED" };

        transactions.findTransactionWithItems.mockResolvedValue(existing);
        transactions.updateTransaction.mockResolvedValue(updated);

        const result = await useCase.execute("tx_1", { status: "APPROVED" });

        expect(transactions.updateTransactionAndDecrementStock).not.toHaveBeenCalled();
        expect(transactions.updateTransaction).toHaveBeenCalledWith(
          "tx_1",
          expect.objectContaining({ status: "APPROVED" })
        );
        expect(result).toEqual(ok(updated));
      });
    });

    describe("when approving would make stock go below zero", () => {
      it("returns InsufficientStock and does not persist the update", async () => {
        const existing: TransactionWithItems = {
          id: "tx_1",
          status: "PENDING",
          items: [
            {
              productId: "prod_1",
              name: "Product",
              imageUrl: null,
              priceCents: 500,
              quantity: 2,
            },
          ],
        };
        const products: ProductSnapshot[] = [
          {
            id: "prod_1",
            name: "Product",
            imageUrl: null,
            priceCents: 500,
            stock: 1,
          },
        ];

        transactions.findTransactionWithItems.mockResolvedValue(existing);
        transactions.findProductsByIds.mockResolvedValue(products);

        const result = await useCase.execute("tx_1", { status: "APPROVED" });

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.type).toBe("InsufficientStock");
        }
        expect(transactions.updateTransactionAndDecrementStock).not.toHaveBeenCalled();
        expect(transactions.updateTransaction).not.toHaveBeenCalled();
      });
    });
  });
});
