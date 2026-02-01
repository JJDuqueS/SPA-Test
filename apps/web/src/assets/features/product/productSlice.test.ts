import reducer, { applyStockUpdate } from "./productSlice";

describe("productSlice", () => {
  it("applies stock updates and clamps at 0", () => {
    const initial = reducer(undefined, { type: "init" });
    const seeded = {
      ...initial,
      products: [
        {
          id: "p-1",
          name: "Product 1",
          description: "",
          imageUrl: "",
          priceCents: 1000,
          stock: 5,
        },
        {
          id: "p-2",
          name: "Product 2",
          description: "",
          imageUrl: "",
          priceCents: 2000,
          stock: 1,
        },
      ],
      product: {
        id: "p-1",
        name: "Product 1",
        description: "",
        imageUrl: "",
        priceCents: 1000,
        stock: 5,
      },
    };

    const updated = reducer(
      seeded,
      applyStockUpdate([
        { productId: "p-1", quantity: 2 },
        { productId: "p-2", quantity: 5 },
        { productId: "p-404", quantity: 1 },
      ])
    );

    expect(updated.products.find((p) => p.id === "p-1")?.stock).toBe(3);
    expect(updated.product?.stock).toBe(3);
    expect(updated.products.find((p) => p.id === "p-2")?.stock).toBe(0);
  });
});

