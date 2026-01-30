import React, { useEffect, useMemo, useState } from "react";
import "./ProductPage.css";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { fetchProducts } from "../features/product/productSlice";
import {
  addToCart,
  removeFromCart,
  updateCartQuantity,
} from "../features/checkout/checkoutSlice";
import { BASE_FEE_CENTS, DELIVERY_FEE_CENTS } from "./checkoutConstants";

const API_URL = import.meta.env.VITE_API_URL ?? "";

const fallbackProducts = [
  {
    id: "demo-1",
    name: "Starter Kit para Casa",
    description: "Set de hogar con envio rapido y soporte local.",
    imageUrl: "https://picsum.photos/seed/starter-kit/900/700",
    priceCents: 189900,
    stock: 6,
  },
  {
    id: "demo-2",
    name: "Auriculares Bluetooth",
    description: "Cancelacion de ruido y bateria extendida.",
    imageUrl: "https://picsum.photos/seed/headphones/900/700",
    priceCents: 129900,
    stock: 4,
  },
  {
    id: "demo-3",
    name: "Teclado Mecanico",
    description: "Switches lineales, RGB, hot-swap.",
    imageUrl: "https://picsum.photos/seed/keyboard/900/700",
    priceCents: 149900,
    stock: 7,
  },
];

const ProductPage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { products: storeProducts, loading, error } = useAppSelector(
    (state) => state.product
  );
  const cart = useAppSelector((state) => state.checkout.cart ?? []);
  const [pendingQtyById, setPendingQtyById] = useState<Record<string, number>>(
    {}
  );

  useEffect(() => {
    if (storeProducts.length === 0 && !loading && !error && API_URL) {
      dispatch(fetchProducts());
    }
  }, [dispatch, loading, error, storeProducts.length]);

  const cartQuantityById = useMemo(() => {
    return cart.reduce<Record<string, number>>((acc, item) => {
      acc[item.productId] = (acc[item.productId] ?? 0) + item.quantity;
      return acc;
    }, {});
  }, [cart]);

  const products = useMemo(
    () => (storeProducts.length > 0 ? storeProducts : fallbackProducts),
    [storeProducts]
  );

  useEffect(() => {
    if (cart.length === 0) return;
    cart.forEach((item) => {
      const productInfo = products.find(
        (entry) => entry.id === item.productId
      );
      if (!productInfo) return;
      if (productInfo.stock <= 0) {
        dispatch(removeFromCart(item.productId));
        return;
      }
      if (item.quantity > productInfo.stock) {
        dispatch(
          updateCartQuantity({
            productId: item.productId,
            quantity: productInfo.stock,
          })
        );
      }
    });
  }, [cart, products, dispatch]);

  const formatter = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }),
    []
  );

  const cartSubtotalCents = cart.reduce(
    (sum, item) => sum + item.priceCents * item.quantity,
    0
  );
  const totalCents =
    cartSubtotalCents + BASE_FEE_CENTS + DELIVERY_FEE_CENTS;

  const getPendingQty = (productId: string, maxStock: number) => {
    const pending = pendingQtyById[productId] ?? 1;
    return Math.min(Math.max(1, pending), Math.max(1, maxStock));
  };

  const handlePendingQtyChange = (
    productId: string,
    value: number,
    maxStock: number
  ) => {
    setPendingQtyById((prev) => ({
      ...prev,
      [productId]: Math.min(Math.max(1, value), Math.max(1, maxStock)),
    }));
  };

  const handleAddToCart = (productId: string, maxStock: number) => {
    const product = products.find((item) => item.id === productId);
    if (!product) return;
    const pendingQty = getPendingQty(productId, maxStock);
    if (pendingQty <= 0) return;
    dispatch(
      addToCart({
        productId: product.id,
        name: product.name,
        priceCents: product.priceCents,
        quantity: pendingQty,
        imageUrl: product.imageUrl,
      })
    );
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;
    navigate("/checkout");
  };

  return (
    <div className="product-page">
      <div className="page-shell">
        <header className="page-header">
          <div>
            <p className="eyebrow">Checkout demo</p>
            <h1>Product page</h1>
          </div>
        </header>

        <main className="content-grid">
          <section className="product-list">
            {products.map((product) => {
              const inCart = cartQuantityById[product.id] ?? 0;
              const available = Math.max(0, product.stock - inCart);
              const pendingQty = getPendingQty(product.id, available);
              return (
                <article className="product-item" key={product.id}>
                  <div className="image-frame">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} />
                    ) : (
                      <div className="image-fallback" />
                    )}
                  </div>
                  <div className="product-info">
                    <div className="product-meta">
                      <h2>{product.name}</h2>
                      <p>{product.description}</p>
                    </div>
                    <div className="product-pricing">
                      <div>
                        <span className="label">Price</span>
                        <strong>
                          {formatter.format(product.priceCents / 100)}
                        </strong>
                      </div>
                      <div>
                        <span className="label">Stock</span>
                        <strong>{available} units</strong>
                      </div>
                      <div>
                        <span className="label">In cart</span>
                        <strong>{inCart}</strong>
                      </div>
                      <div>
                        <span className="label">Add qty</span>
                        <input
                          type="number"
                          min={1}
                          max={Math.max(1, available)}
                          value={pendingQty}
                          onChange={(event) => {
                            const next = Number.parseInt(
                              event.target.value,
                              10
                            );
                            if (Number.isNaN(next)) return;
                            handlePendingQtyChange(
                              product.id,
                              next,
                              available
                            );
                          }}
                        />
                      </div>
                    </div>
                    <div className="action-row">
                      <button
                        className="btn btn-primary"
                        onClick={() => handleAddToCart(product.id, available)}
                        disabled={available === 0}
                      >
                        Add to cart
                      </button>
                      <button
                        className="btn btn-ghost"
                        onClick={() => dispatch(fetchProducts())}
                        disabled={!API_URL}
                      >
                        Refresh stock
                      </button>
                    </div>
                    {available === 0 ? (
                      <p className="warning">No stock available right now.</p>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </section>

          <aside className="fee-card">
            <h3>Cart summary</h3>
            {cart.length === 0 ? (
              <p className="muted">Add products to start checkout.</p>
            ) : (
              <div className="cart-list">
                {cart.map((item) => {
                  const productInfo = products.find(
                    (entry) => entry.id === item.productId
                  );
                  const maxQty = Math.max(1, productInfo?.stock ?? item.quantity);
                  const disableQty = (productInfo?.stock ?? 1) <= 0;
                  return (
                    <div className="cart-row" key={item.productId}>
                      <div>
                        <strong>{item.name}</strong>
                        <span className="muted">
                          {formatter.format(item.priceCents / 100)}
                        </span>
                      </div>
                      <div className="cart-actions">
                        <input
                          type="number"
                          min={1}
                          max={maxQty}
                          value={item.quantity}
                          disabled={disableQty}
                          onChange={(event) => {
                            const next = Number.parseInt(
                              event.target.value,
                              10
                            );
                            if (Number.isNaN(next)) return;
                            dispatch(
                              updateCartQuantity({
                                productId: item.productId,
                                quantity: Math.min(Math.max(1, next), maxQty),
                              })
                            );
                          }}
                        />
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => dispatch(removeFromCart(item.productId))}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="fee-row">
              <span>Product amount</span>
              <span>{formatter.format(cartSubtotalCents / 100)}</span>
            </div>
            <div className="fee-row">
              <span>Base fee</span>
              <span>{formatter.format(BASE_FEE_CENTS / 100)}</span>
            </div>
            <div className="fee-row">
              <span>Delivery fee</span>
              <span>{formatter.format(DELIVERY_FEE_CENTS / 100)}</span>
            </div>
            <div className="fee-row total">
              <span>Total with fees</span>
              <span>{formatter.format(totalCents / 100)}</span>
            </div>
            <p className="muted">
              Base fee is always added. Delivery fee covers local dispatch.
            </p>
            <div className="action-row">
              <button
                className="btn btn-primary"
                onClick={handleCheckout}
                disabled={cart.length === 0}
              >
                Pay with credit card
              </button>
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
};

export default ProductPage;
