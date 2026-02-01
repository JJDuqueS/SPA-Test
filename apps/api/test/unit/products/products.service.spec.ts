import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import type { Product } from "@prisma/client";
import type { CreateProductDto } from "../../../src/modules/products/dto/create-product.dto";
import { ProductsService } from "../../../src/modules/products/products.service";
import { PrismaService } from "../../../src/prisma/prisma.service";

const buildProduct = (overrides: Partial<Product> = {}): Product => ({
  id: "prod_1",
  name: "Test Product",
  description: "Test description",
  imageUrl: "https://example.com/product.png",
  priceCents: 1999,
  stock: 5,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe("ProductsService", () => {
  let service: ProductsService;
  type PrismaProductMock = {
    findMany: jest.Mock;
    findUnique: jest.Mock;
    create: jest.Mock;
  };
  type PrismaServiceMock = {
    product: PrismaProductMock;
  };
  let prisma: PrismaServiceMock;

  beforeEach(async () => {
    const prismaMock: PrismaServiceMock = {
      product: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get(ProductsService);
    prisma = prismaMock;
  });

  describe("findAll", () => {
    it("returns products ordered by createdAt desc", async () => {
      const products = [buildProduct()];

      prisma.product.findMany.mockResolvedValue(products);

      const result = await service.findAll();

      expect(prisma.product.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: "desc" },
      });
      expect(result).toEqual({
        message: "Todos los productos",
        products,
      });
    });
  });

  describe("findById", () => {
    it("returns the product when found", async () => {
      const product = buildProduct({ id: "prod_2" });

      prisma.product.findUnique.mockResolvedValue(product);

      const result = await service.findById("prod_2");

      expect(prisma.product.findUnique).toHaveBeenCalledWith({
        where: { id: "prod_2" },
      });
      expect(result).toEqual(product);
    });

    it("throws NotFoundException when product does not exist", async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(service.findById("missing")).rejects.toBeInstanceOf(
        NotFoundException
      );
    });
  });

  describe("create", () => {
    it("creates a product with the given data", async () => {
      const dto: CreateProductDto = {
        name: "New Product",
        priceCents: 3000,
        stock: 10,
      };

      const created = buildProduct({ ...dto });

      prisma.product.create.mockResolvedValue(created);

      const result = await service.create(dto);

      expect(prisma.product.create).toHaveBeenCalledWith({ data: dto });
      expect(result).toEqual(created);
    });
  });
});
