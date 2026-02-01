import { Test, TestingModule } from "@nestjs/testing";
import { ok } from "../../../src/common/rop/result";
import { CreateTransactionUseCase } from "../../../src/modules/transactions/application/create-transaction.use-case";
import type { CreateTransactionDto } from "../../../src/modules/transactions/dto/create-transaction.dto";
import {
  TRANSACTIONS_PORT,
  type ProductSnapshot,
  type TransactionsPort,
} from "../../../src/modules/transactions/ports/transactions.port";

const buildCreatePayload = (
  overrides: Partial<CreateTransactionDto> = {}
): CreateTransactionDto => ({
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
  customer: {
    fullName: "Test Customer",
    email: "test@example.com",
  },
  delivery: {
    addressLine1: "123 Main St",
    city: "Test City",
  },
  cardBrand: "VISA",
  cardLast4: "4242",
  ...overrides,
});

const buildProductSnapshot = (
  overrides: Partial<ProductSnapshot> = {}
): ProductSnapshot => ({
  id: "prod_1",
  name: "Product",
  imageUrl: null,
  priceCents: 500,
  stock: 10,
  ...overrides,
});

describe("CreateTransactionUseCase", () => {
  let useCase: CreateTransactionUseCase;
  type TransactionsMock = jest.Mocked<
    Pick<TransactionsPort, "findProductsByIds" | "createTransaction">
  >;
  let transactions: TransactionsMock;

  beforeEach(async () => {
    const transactionsMock: TransactionsMock = {
      findProductsByIds: jest.fn(),
      createTransaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateTransactionUseCase,
        {
          provide: TRANSACTIONS_PORT,
          useValue: transactionsMock,
        },
      ],
    }).compile();

    useCase = module.get(CreateTransactionUseCase);
    transactions = transactionsMock;
  });

  it("returns InvalidPayload when required fields are missing", async () => {
    const result = await useCase.execute({
      items: [],
      amountCents: 0,
      baseFeeCents: 0,
      deliveryFeeCents: 0,
      customer: { fullName: "", email: "" },
      delivery: { addressLine1: "", city: "" },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.type).toBe("InvalidPayload");
    }
  });

  it("creates a transaction when payload is valid", async () => {
    const payload = buildCreatePayload();
    const products = [buildProductSnapshot()];
    const created = { id: "tx_1", reference: "REF-ABC", status: "PENDING" as const };

    transactions.findProductsByIds.mockResolvedValue(products);
    transactions.createTransaction.mockResolvedValue(created);

    const result = await useCase.execute(payload);

    expect(transactions.findProductsByIds).toHaveBeenCalledWith(["prod_1"]);
    expect(transactions.createTransaction).toHaveBeenCalledTimes(1);
    expect(result).toEqual(ok(created));
  });

  it("always persists new transactions with status PENDING", async () => {
    const payload = buildCreatePayload();
    transactions.findProductsByIds.mockResolvedValue([buildProductSnapshot()]);

    transactions.createTransaction.mockResolvedValue({
      id: "tx_1",
      reference: "REF-ABC",
      status: "PENDING",
    });

    await useCase.execute(payload);

    expect(transactions.createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "PENDING",
      })
    );
  });
});
