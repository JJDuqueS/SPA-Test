export interface TransactionItemDto {
  productId: string;
  name: string;
  priceCents: number;
  quantity: number;
  imageUrl?: string;
}

export interface CustomerDto {
  fullName: string;
  email: string;
  phone?: string;
}

export interface DeliveryDto {
  addressLine1: string;
  city: string;
  state?: string;
  postalCode?: string;
  notes?: string;
}

export class CreateTransactionDto {
  items!: TransactionItemDto[];
  amountCents!: number;
  baseFeeCents!: number;
  deliveryFeeCents!: number;
  customer!: CustomerDto;
  delivery!: DeliveryDto;
  cardBrand?: string;
  cardLast4?: string;
}
