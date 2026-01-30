import { Controller, Get, NotFoundException, Param } from "@nestjs/common";
import { ProductsService } from "./products.service";

@Controller("products")
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}
  @Get()
  async getAll() {
    return this.productsService.findAll();
  }

  @Get(":id")
  async getById(@Param("id") id: string) {
    const product = await this.productsService.findById(id);

    if (!product) {
      throw new NotFoundException("Product not found");
    }

    return product;
  }
}
