import { Body, Controller, Get, NotFoundException, Param, Post } from "@nestjs/common";
import { ProductsService } from "./products.service";
import { type CreateProductDto } from "./dto/create-product.dto";

@Controller("products")
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}
  @Get()
  async getAll() {
    return this.productsService.findAll();
  }

  @Post()
  async create(@Body() body: CreateProductDto) {
    return this.productsService.create(body);
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
