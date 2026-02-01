import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import type { Product } from "@prisma/client";
import { ProductsController } from "../../../src/modules/products/products.controller";
import { ProductsService } from "../../../src/modules/products/products.service";

const buildProduct = (overrides: Partial<Product> = {}): Product => ({
  id: "prod_1",
  name: "Test Product",
  description: "Test description",
  imageUrl: "https://example.com/product.png",
  priceCents: 1999,
  stock: 5,
  createdAt: new Date("2025-01-01T00:00:00.000Z"),
  updatedAt: new Date("2025-01-02T00:00:00.000Z"),
  ...overrides,
});

describe("ProductsController", () => {
  let controller: ProductsController;
  type ProductsServiceMock = jest.Mocked<
    Pick<ProductsService, "findAll" | "create" | "findById">
  >;
  let productsService: ProductsServiceMock;

  beforeEach(async () => {
    const productsServiceMock: ProductsServiceMock = {
      findAll: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        {
          provide: ProductsService,
          useValue: productsServiceMock,
        },
      ],
    }).compile();

    controller = module.get(ProductsController);
    productsService = productsServiceMock;
  });

  describe("getAll", () => {
    it("returns the service response and calls findAll once", async () => {
      const products = [buildProduct()];
      const response = {
        message: "Todos los productos",
        products,
      };

      productsService.findAll.mockResolvedValue(response);

      const result = await controller.getAll();

      expect(productsService.findAll).toHaveBeenCalledTimes(1);
      expect(result).toEqual(response);
    });
  });

  describe("getById", () => {
    it("returns the product when found", async () => {
      const product = buildProduct({ id: "prod_2" });

      productsService.findById.mockResolvedValue(product);

      const result = await controller.getById(product.id);

      expect(productsService.findById).toHaveBeenCalledWith(product.id);
      expect(result).toEqual(product);
    });

    it("throws NotFoundException when the service returns null", async () => {
      productsService.findById.mockResolvedValue(null as unknown as Product);

      await expect(controller.getById("missing")).rejects.toBeInstanceOf(
        NotFoundException
      );
    });

    it("bubbles a NotFoundException thrown by the service", async () => {
      productsService.findById.mockRejectedValue(
        new NotFoundException("Product not found")
      );

      await expect(controller.getById("missing")).rejects.toBeInstanceOf(
        NotFoundException
      );
    });
  });

  describe("create", () => {
    it("creates a product through the service", async () => {
      const payload = {
        name: "New Product",
        priceCents: 2500,
        stock: 10,
      };
      const created = buildProduct({ id: "prod_new", ...payload });

      productsService.create.mockResolvedValue(created);

      const result = await controller.create(payload);

      expect(productsService.create).toHaveBeenCalledWith(payload);
      expect(result).toEqual(created);
    });
  });
});
