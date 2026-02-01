import reducer, {
  addToCart,
  clearCart,
  removeFromCart,
  resetCheckout,
  setStatus,
  setTransaction,
  updateCartQuantity,
} from "./checkoutSlice";

describe("checkoutSlice", () => {
  it("adds items and merges quantities by productId", () => {
    const initial = reducer(undefined, { type: "init" });
    const withItem = reducer(
      initial,
      addToCart({
        productId: "p-1",
        name: "Product",
        priceCents: 1000,
        quantity: 1,
        imageUrl: "",
      })
    );
    const merged = reducer(
      withItem,
      addToCart({
        productId: "p-1",
        name: "Product",
        priceCents: 1000,
        quantity: 2,
        imageUrl: "",
      })
    );

    expect(merged.cart).toHaveLength(1);
    expect(merged.cart[0]?.quantity).toBe(3);
  });

  it("clamps cart quantity to minimum 1", () => {
    const initial = reducer(undefined, { type: "init" });
    const withItem = reducer(
      initial,
      addToCart({
        productId: "p-1",
        name: "Product",
        priceCents: 1000,
        quantity: 2,
        imageUrl: "",
      })
    );

    const updated = reducer(
      withItem,
      updateCartQuantity({ productId: "p-1", quantity: 0 })
    );

    expect(updated.cart[0]?.quantity).toBe(1);
  });

  it("removes and clears items", () => {
    const initial = reducer(undefined, { type: "init" });
    const withItem = reducer(
      initial,
      addToCart({
        productId: "p-1",
        name: "Product",
        priceCents: 1000,
        quantity: 1,
        imageUrl: "",
      })
    );

    const removed = reducer(withItem, removeFromCart("p-1"));
    expect(removed.cart).toHaveLength(0);

    const cleared = reducer(withItem, clearCart());
    expect(cleared.cart).toHaveLength(0);
  });

  it("stores transaction metadata and status", () => {
    const initial = reducer(undefined, { type: "init" });
    const withTx = reducer(
      initial,
      setTransaction({ transactionId: "tx-1", reference: "ref-1" })
    );
    expect(withTx.transactionId).toBe("tx-1");
    expect(withTx.reference).toBe("ref-1");

    const withStatus = reducer(withTx, setStatus("APPROVED"));
    expect(withStatus.status).toBe("APPROVED");
  });

  it("resets back to initialState", () => {
    const initial = reducer(undefined, { type: "init" });
    const mutated = reducer(
      initial,
      addToCart({
        productId: "p-1",
        name: "Product",
        priceCents: 1000,
        quantity: 1,
        imageUrl: "",
      })
    );

    const reset = reducer(mutated, resetCheckout());
    expect(reset).toEqual(initial);
  });
});

