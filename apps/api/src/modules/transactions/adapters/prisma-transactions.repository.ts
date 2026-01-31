import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../../prisma/prisma.service";
import {
  type CreateTransactionPersistence,
  type CreateTransactionRecord,
  type ProductSnapshot,
  type TransactionListItem,
  type TransactionUpdatePersistence,
  type TransactionWithItems,
  type TransactionsPort,
} from "../ports/transactions.port";

@Injectable()
export class PrismaTransactionsRepository implements TransactionsPort {
  constructor(private readonly prisma: PrismaService) {}

  async findProductsByIds(ids: string[]): Promise<ProductSnapshot[]> {
    if (ids.length === 0) return [];
    return this.prisma.product.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        name: true,
        imageUrl: true,
        priceCents: true,
        stock: true,
      },
    });
  }

  async createTransaction(
    data: CreateTransactionPersistence
  ): Promise<CreateTransactionRecord> {
    return this.prisma.$transaction(async (tx) => {
      const customer = await tx.customer.create({
        data: {
          fullName: data.customer.fullName,
          email: data.customer.email,
          phone: data.customer.phone ?? null,
        },
      });

      const delivery = await tx.delivery.create({
        data: {
          customerId: customer.id,
          addressLine1: data.delivery.addressLine1,
          city: data.delivery.city,
          state: data.delivery.state ?? null,
          postalCode: data.delivery.postalCode ?? null,
          notes: data.delivery.notes ?? null,
          feeCents: data.deliveryFeeCents,
        },
      });

      return tx.transaction.create({
        data: {
          reference: data.reference,
          status: data.status,
          productId: data.primaryProductId,
          amountCents: data.amountCents,
          baseFeeCents: data.baseFeeCents,
          cardBrand: data.cardBrand ?? null,
          cardLast4: data.cardLast4 ?? null,
          customerId: customer.id,
          deliveryId: delivery.id,
          items: {
            create: data.items.map((item) => ({
              productId: item.productId,
              name: item.name,
              imageUrl: item.imageUrl ?? null,
              priceCents: item.priceCents,
              quantity: item.quantity,
            })),
          },
        },
        select: {
          id: true,
          reference: true,
          status: true,
        },
      });
    });
  }

  async listTransactions(): Promise<TransactionListItem[]> {
    const rows = await this.prisma.transaction.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        reference: true,
        status: true,
        amountCents: true,
        baseFeeCents: true,
        cardBrand: true,
        cardLast4: true,
        createdAt: true,
        customer: {
          select: {
            fullName: true,
            email: true,
            phone: true,
          },
        },
        delivery: {
          select: {
            addressLine1: true,
            city: true,
            state: true,
            postalCode: true,
            notes: true,
            feeCents: true,
          },
        },
        items: {
          select: {
            productId: true,
            name: true,
            imageUrl: true,
            priceCents: true,
            quantity: true,
          },
        },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      reference: row.reference,
      status: row.status,
      amountCents: row.amountCents,
      baseFeeCents: row.baseFeeCents,
      deliveryFeeCents: row.delivery?.feeCents ?? 0,
      cardBrand: row.cardBrand,
      cardLast4: row.cardLast4,
      createdAt: row.createdAt,
      customer: row.customer,
      delivery: row.delivery,
      items: row.items,
    }));
  }

  async findTransactionWithItems(
    id: string
  ): Promise<TransactionWithItems | null> {
    return this.prisma.transaction.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        items: {
          select: {
            productId: true,
            name: true,
            imageUrl: true,
            priceCents: true,
            quantity: true,
          },
        },
      },
    });
  }

  async updateTransaction(
    id: string,
    data: TransactionUpdatePersistence
  ) {
    try {
      return await this.prisma.transaction.update({
        where: { id },
        data,
        select: {
          id: true,
          status: true,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") return null;
      }
      throw error;
    }
  }

  async updateTransactionAndDecrementStock(
    id: string,
    data: TransactionUpdatePersistence,
    adjustments: Array<{ productId: string; quantity: number }>
  ) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const updated = await tx.transaction.update({
          where: { id },
          data,
          select: {
            id: true,
            status: true,
          },
        });

        for (const adjustment of adjustments) {
          await tx.product.update({
            where: { id: adjustment.productId },
            data: {
              stock: {
                decrement: adjustment.quantity,
              },
            },
          });
        }

        return updated;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") return null;
      }
      throw error;
    }
  }
}
