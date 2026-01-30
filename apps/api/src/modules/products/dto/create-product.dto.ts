export type CreateProductDto = {
  name: string;
  description?: string;
  imageUrl?: string;
  priceCents: number;
  stock?: number;
};
