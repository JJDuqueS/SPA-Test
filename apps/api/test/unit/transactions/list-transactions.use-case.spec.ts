import { Test, TestingModule } from "@nestjs/testing";
import { ok } from "../../../src/common/rop/result";
import { ListTransactionsUseCase } from "../../../src/modules/transactions/application/list-transactions.use-case";
import {
  TRANSACTIONS_PORT,
  type TransactionListItem,
  type TransactionsPort,
} from "../../../src/modules/transactions/ports/transactions.port";

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

describe("ListTransactionsUseCase", () => {
  let useCase: ListTransactionsUseCase;
  type TransactionsMock = jest.Mocked<Pick<TransactionsPort, "listTransactions">>;
  let transactions: TransactionsMock;

  beforeEach(async () => {
    const transactionsMock: TransactionsMock = {
      listTransactions: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListTransactionsUseCase,
        {
          provide: TRANSACTIONS_PORT,
          useValue: transactionsMock,
        },
      ],
    }).compile();

    useCase = module.get(ListTransactionsUseCase);
    transactions = transactionsMock;
  });

  it("returns the list of transactions", async () => {
    const rows = [buildListItem()];

    transactions.listTransactions.mockResolvedValue(rows);

    const result = await useCase.execute();

    expect(transactions.listTransactions).toHaveBeenCalledTimes(1);
    expect(result).toEqual(ok(rows));
  });
});
