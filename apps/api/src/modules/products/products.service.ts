import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateProductDto } from "./dto/create-product.dto";

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const products = await this.prisma.product.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });
    return { message: "Todos los productos", products };
  }

  async create(data: CreateProductDto) {
    return this.prisma.product.create({ data });
  }
  async findById(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException("Product not found"); // redudant, but adds message
    return product;
  }
  // async findById(id: string) {
  //   return this.prisma.product.findUnique({
  //     where: { id },
  //   });
  // }
}
