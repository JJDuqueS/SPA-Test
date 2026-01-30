import React, { useCallback, useEffect, useMemo, useState } from "react";
import "./ProductPage.css";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { fetchProducts } from "../features/product/productSlice";
import {
  addToCart,
  clearCart,
  removeFromCart,
  resetCheckout,
  setCard,
  setCustomer,
  setDelivery,
  setStatus,
  setStep,
  setTransaction,
  updateCartQuantity,
} from "../features/checkout/checkoutSlice";

const BASE_FEE_CENTS = 900;
const DELIVERY_FEE_CENTS = 1500;
const API_URL = import.meta.env.VITE_API_URL ?? "";
const WOMPI_ENDPOINT = import.meta.env.VITE_WOMPI_ENDPOINT ?? "";

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

const formatCardNumber = (value: string) =>
  value
    .replace(/\D/g, "")
    .slice(0, 19)
    .replace(/(\d{4})(?=\d)/g, "$1 ");

const detectCardBrand = (digits: string) => {
  const visa = /^4\d{12}(\d{3})?(\d{3})?$/.test(digits);
  const mastercard =
    /^(5[1-5]\d{14}|2(2[2-9]\d{12}|[3-6]\d{13}|7[01]\d{12}|720\d{12}))$/.test(
      digits
    );
  if (visa) return "VISA";
  if (mastercard) return "MASTERCARD"; // TODO ------------------>
  return null;
};

const luhnCheck = (value: string) => {
  let sum = 0;
  let shouldDouble = false;
  for (let i = value.length - 1; i >= 0; i -= 1) {
    let digit = Number.parseInt(value.charAt(i), 10);
    if (Number.isNaN(digit)) return false;
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
};

const getExpiryYear = (value: string) => {
  const trimmed = value.trim();
  if (trimmed.length === 2) {
    return 2000 + Number.parseInt(trimmed, 10);
  }
  return Number.parseInt(trimmed, 10);
};

const createLocalReference = () =>
  `REF-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

const tryCreateTransaction = async (payload: Record<string, unknown>) => {
  const fallback = {
    transactionId: `tx_${Date.now()}`,
    reference: createLocalReference(),
    simulated: true,
  };
  if (!API_URL) return fallback;
  try {
    const res = await fetch(`${API_URL}/transactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("create transaction failed");
    const data = await res.json();
    return {
      transactionId: data.id ?? data.transactionId ?? fallback.transactionId,
      reference: data.reference ?? data.ref ?? fallback.reference,
      simulated: false,
    };
  } catch {
    return fallback;
  }
};

const tryUpdateTransaction = async (
  transactionId: string,
  payload: Record<string, unknown>
) => {
  if (!API_URL) return { simulated: true };
  try {
    const res = await fetch(`${API_URL}/transactions/${transactionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("update transaction failed");
    return { simulated: false };
  } catch {
    return { simulated: true };
  }
};

const tryWompiPayment = async (payload: Record<string, unknown>) => {
  const fallback = {
    status: "APPROVED" as const,
    providerTxId: `wompi_${Date.now()}`,
    simulated: true,
  };
  if (!WOMPI_ENDPOINT) return fallback;
  try {
    const res = await fetch(WOMPI_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("wompi failed");
    const data = await res.json();
    return {
      status: data.status ?? fallback.status,
      providerTxId: data.id ?? data.transactionId ?? fallback.providerTxId,
      simulated: false,
    };
  } catch {
    return fallback;
  }
};

const ProductPage = () => {
  const dispatch = useAppDispatch();
  const { products: storeProducts, loading } = useAppSelector(
    (state) => state.product
  );
  const checkout = useAppSelector((state) => state.checkout);
  const cart = checkout.cart ?? [];
  const [overrideStocks, setOverrideStocks] = useState<Record<string, number>>(
    {}
  );
  const [pendingQtyById, setPendingQtyById] = useState<Record<string, number>>(
    {}
  );
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [flowNotice, setFlowNotice] = useState<string | null>(null);

  const handleBackToProduct = useCallback(() => {
    dispatch(resetCheckout());
    dispatch(clearCart());
    setShowPaymentModal(false);
    setShowSummary(false);
    setProcessing(false);
    setFlowNotice(null);
    setPendingQtyById({});
  }, [dispatch]);

  useEffect(() => {
    if (storeProducts.length === 0 && !loading && API_URL) {
      dispatch(fetchProducts());
    }
  }, [dispatch, loading, storeProducts.length]);

  const cartQuantityById = useMemo(() => {
    return cart.reduce<Record<string, number>>((acc, item) => {
      acc[item.productId] = (acc[item.productId] ?? 0) + item.quantity;
      return acc;
    }, {});
  }, [cart]);

  const products = useMemo(() => {
    const base = storeProducts.length > 0 ? storeProducts : fallbackProducts;
    return base.map((item) => ({
      ...item,
      stock: overrideStocks[item.id] ?? item.stock,
    }));
  }, [overrideStocks, storeProducts]);

  useEffect(() => {
    if (checkout.step < 4) return;
    if (!checkout.status || checkout.status === "PENDING") return;
    const timeout = window.setTimeout(() => {
      handleBackToProduct();
    }, 6000);
    return () => window.clearTimeout(timeout);
  }, [checkout.step, checkout.status, handleBackToProduct]);

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
  const totalItems = cart.reduce(
    (sum, item) => sum + item.quantity,
    0
  );
  const cardDigits = checkout.card.cardNumber.replace(/\D/g, "");
  const cardBrand = detectCardBrand(cardDigits);
  const cardLast4 = cardDigits.slice(-4);

  const handleCustomerChange = (key: keyof typeof checkout.customer) => {
    return (event: React.ChangeEvent<HTMLInputElement>) => {
      dispatch(
        setCustomer({
          ...checkout.customer,
          [key]: event.target.value,
        })
      );
    };
  };

  const handleDeliveryChange = (key: keyof typeof checkout.delivery) => {
    return (
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
      dispatch(
        setDelivery({
          ...checkout.delivery,
          [key]: event.target.value,
        })
      );
    };
  };

  const handleCardChange = (key: keyof typeof checkout.card) => {
    return (event: React.ChangeEvent<HTMLInputElement>) => {
      const value =
        key === "cardNumber"
          ? formatCardNumber(event.target.value)
          : event.target.value;
      dispatch(
        setCard({
          ...checkout.card,
          [key]: value,
        })
      );
    };
  };

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

  const openPaymentModal = () => {
    setFormErrors({});
    setFlowNotice(null);
    dispatch(setStatus(null));
    dispatch(setStep(2));
    setShowPaymentModal(true);
  };

  const closePaymentModal = () => {
    setShowPaymentModal(false);
    dispatch(setStep(1));
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!checkout.customer.fullName.trim()) {
      errors.fullName = "Full name is required.";
    }
    if (!checkout.customer.email.includes("@")) {
      errors.email = "Enter a valid email.";
    }
    if (checkout.customer.phone.replace(/\D/g, "").length < 7) {
      errors.phone = "Phone number is too short.";
    }
    if (!checkout.delivery.addressLine1.trim()) {
      errors.addressLine1 = "Address is required.";
    }
    if (!checkout.delivery.city.trim()) {
      errors.city = "City is required.";
    }
    if (!checkout.delivery.state.trim()) {
      errors.state = "State is required.";
    }
    if (!checkout.delivery.postalCode.trim()) {
      errors.postalCode = "Postal code is required.";
    }

    const expMonth = Number.parseInt(checkout.card.expMonth, 10);
    const expYear = getExpiryYear(checkout.card.expYear);
    const now = new Date();
    const expDate = new Date(expYear, expMonth - 1, 1);
    if (!cardDigits) {
      errors.cardNumber = "Card number is required.";
    } else if (!cardBrand || !luhnCheck(cardDigits)) {
      errors.cardNumber = "Only valid VISA or MasterCard numbers.";
    }
    if (!checkout.card.holderName.trim()) {
      errors.holderName = "Card holder name is required.";
    }
    if (Number.isNaN(expMonth) || expMonth < 1 || expMonth > 12) {
      errors.expMonth = "Invalid month.";
    }
    if (Number.isNaN(expYear) || expYear < now.getFullYear()) {
      errors.expYear = "Invalid year.";
    } else if (
      expDate.getFullYear() === now.getFullYear() &&
      expMonth < now.getMonth() + 1
    ) {
      errors.expMonth = "Card is expired.";
    }
    if (!/^\d{3,4}$/.test(checkout.card.cvc)) {
      errors.cvc = "CVC must be 3 or 4 digits.";
    }
    return errors;
  };

  const handleInfoSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});
    setShowPaymentModal(false);
    setShowSummary(true);
    dispatch(setStep(3));
  };

  const handlePayment = async () => {
    if (cart.length === 0) return;
    setProcessing(true);
    setFlowNotice(null);
    dispatch(setStatus("PENDING"));
    dispatch(setStep(4));
    setShowSummary(false);

    try {
      const transactionPayload = {
        items: cart,
        amountCents: totalCents,
        baseFeeCents: BASE_FEE_CENTS,
        deliveryFeeCents: DELIVERY_FEE_CENTS,
        customer: checkout.customer,
        delivery: checkout.delivery,
        cardBrand: cardBrand ?? "UNKNOWN",
        cardLast4,
      };

      const transaction = await tryCreateTransaction(transactionPayload);
      dispatch(
        setTransaction({
          transactionId: transaction.transactionId,
          reference: transaction.reference,
        })
      );

      const defaultDecision =
        Number.parseInt(cardDigits.slice(-1) || "0", 10) % 2 === 0
          ? "APPROVED"
          : "DECLINED";

      const wompiResult = await tryWompiPayment({
        amountCents: totalCents,
        currency: "USD",
        reference: transaction.reference,
        card: checkout.card,
        customer: checkout.customer,
        decisionHint: defaultDecision,
      });

      const finalStatus = wompiResult.status ?? defaultDecision;

      await tryUpdateTransaction(transaction.transactionId, {
        status: finalStatus,
        provider: wompiResult.simulated ? "SIMULATED" : "WOMPI",
        providerTxId: wompiResult.providerTxId,
        cardBrand: cardBrand,
        cardLast4,
      });

      dispatch(setStatus(finalStatus));

      if (finalStatus === "APPROVED") {
        setOverrideStocks((prev) => {
          const updated = { ...prev };
          cart.forEach((item) => {
            const product = products.find((entry) => entry.id === item.productId);
            if (!product) return;
            const available = prev[item.productId] ?? product.stock;
            updated[item.productId] = Math.max(0, available - item.quantity);
          });
          return updated;
        });
      }

      if (transaction.simulated || wompiResult.simulated) {
        setFlowNotice(
          "Backend or Wompi endpoint not available, showing simulated flow."
        );
      }
    } catch (error) {
      dispatch(setStatus("ERROR"));
      setFlowNotice("Payment flow failed. Try again.");
    } finally {
      setProcessing(false);
    }
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
                          onClick={() =>
                            dispatch(removeFromCart(item.productId))
                          }
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
                onClick={openPaymentModal}
                disabled={cart.length === 0}
              >
                Pay with credit card
              </button>
            </div>
          </aside>
        </main>

        {showPaymentModal ? (
          <div className="backdrop">
            <form className="modal" onSubmit={handleInfoSubmit}>
              <header>
                <h3>Credit card and delivery info</h3>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={closePaymentModal}
                >
                  Close
                </button>
              </header>

              <div className="form-section">
                <h4>Customer</h4>
                <div className="form-grid">
                  <label className="field">
                    <span>Full name</span>
                    <input
                      type="text"
                      value={checkout.customer.fullName}
                      onChange={handleCustomerChange("fullName")}
                    />
                    {formErrors.fullName ? (
                      <em>{formErrors.fullName}</em>
                    ) : null}
                  </label>
                  <label className="field">
                    <span>Email</span>
                    <input
                      type="email"
                      value={checkout.customer.email}
                      onChange={handleCustomerChange("email")}
                    />
                    {formErrors.email ? <em>{formErrors.email}</em> : null}
                  </label>
                  <label className="field">
                    <span>Phone</span>
                    <input
                      type="tel"
                      value={checkout.customer.phone}
                      onChange={handleCustomerChange("phone")}
                    />
                    {formErrors.phone ? <em>{formErrors.phone}</em> : null}
                  </label>
                </div>
              </div>

              <div className="form-section">
                <h4>Delivery</h4>
                <div className="form-grid">
                  <label className="field span-2">
                    <span>Address line 1</span>
                    <input
                      type="text"
                      value={checkout.delivery.addressLine1}
                      onChange={handleDeliveryChange("addressLine1")}
                    />
                    {formErrors.addressLine1 ? (
                      <em>{formErrors.addressLine1}</em>
                    ) : null}
                  </label>
                  <label className="field">
                    <span>City</span>
                    <input
                      type="text"
                      value={checkout.delivery.city}
                      onChange={handleDeliveryChange("city")}
                    />
                    {formErrors.city ? <em>{formErrors.city}</em> : null}
                  </label>
                  <label className="field">
                    <span>State</span>
                    <input
                      type="text"
                      value={checkout.delivery.state}
                      onChange={handleDeliveryChange("state")}
                    />
                    {formErrors.state ? <em>{formErrors.state}</em> : null}
                  </label>
                  <label className="field">
                    <span>Postal code</span>
                    <input
                      type="text"
                      value={checkout.delivery.postalCode}
                      onChange={handleDeliveryChange("postalCode")}
                    />
                    {formErrors.postalCode ? (
                      <em>{formErrors.postalCode}</em>
                    ) : null}
                  </label>
                  <label className="field span-2">
                    <span>Notes</span>
                    <textarea
                      value={checkout.delivery.notes}
                      onChange={handleDeliveryChange("notes")}
                      rows={2}
                    />
                  </label>
                </div>
              </div>

              <div className="form-section">
                <h4>Card</h4>
                <div className="form-grid">
                  <label className="field span-2">
                    <span>Card number</span>
                    <div className="card-input">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={checkout.card.cardNumber}
                        onChange={handleCardChange("cardNumber")}
                        placeholder="4111 1111 1111 1111"
                      />
                      <span className="brand-chip">
                        {cardBrand ?? "VISA / MC"}
                      </span>
                    </div>
                    {formErrors.cardNumber ? (
                      <em>{formErrors.cardNumber}</em>
                    ) : null}
                  </label>
                  <label className="field">
                    <span>Exp month</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={checkout.card.expMonth}
                      onChange={handleCardChange("expMonth")}
                      placeholder="08"
                    />
                    {formErrors.expMonth ? (
                      <em>{formErrors.expMonth}</em>
                    ) : null}
                  </label>
                  <label className="field">
                    <span>Exp year</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={checkout.card.expYear}
                      onChange={handleCardChange("expYear")}
                      placeholder="2028"
                    />
                    {formErrors.expYear ? <em>{formErrors.expYear}</em> : null}
                  </label>
                  <label className="field">
                    <span>CVC</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={checkout.card.cvc}
                      onChange={handleCardChange("cvc")}
                      placeholder="123"
                    />
                    {formErrors.cvc ? <em>{formErrors.cvc}</em> : null}
                  </label>
                  <label className="field span-2">
                    <span>Card holder name</span>
                    <input
                      type="text"
                      value={checkout.card.holderName}
                      onChange={handleCardChange("holderName")}
                    />
                    {formErrors.holderName ? (
                      <em>{formErrors.holderName}</em>
                    ) : null}
                  </label>
                </div>
                <p className="helper">
                  Use fake test numbers. Example VISA 4111 1111 1111 1111,
                  MasterCard 5555 5555 5555 4444.
                </p>
              </div>

              <footer className="modal-actions">
                <button type="submit" className="btn btn-primary">
                  Continue to summary
                </button>
              </footer>
            </form>
          </div>
        ) : null}

        {showSummary ? (
          <div className="backdrop">
            <div className="summary-card">
              <header>
                <h3>Payment summary</h3>
                <button
                  className="btn btn-ghost"
                  onClick={() => {
                    setShowSummary(false);
                    setShowPaymentModal(true);
                    dispatch(setStep(2));
                  }}
                >
                  Edit info
                </button>
              </header>
              <div className="summary-list">
                <div className="summary-items">
                  {cart.map((item) => (
                    <div className="summary-row" key={item.productId}>
                      <span>
                        {item.name} x{item.quantity}
                      </span>
                      <span>
                        {formatter.format(
                          (item.priceCents * item.quantity) / 100
                        )}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="summary-row">
                  <span>Product amount</span>
                  <span>{formatter.format(cartSubtotalCents / 100)}</span>
                </div>
                <div className="summary-row">
                  <span>Base fee</span>
                  <span>{formatter.format(BASE_FEE_CENTS / 100)}</span>
                </div>
                <div className="summary-row">
                  <span>Delivery fee</span>
                  <span>{formatter.format(DELIVERY_FEE_CENTS / 100)}</span>
                </div>
                <div className="summary-row total">
                  <span>Total</span>
                  <span>{formatter.format(totalCents / 100)}</span>
                </div>
              </div>
              <button
                className="btn btn-primary"
                onClick={handlePayment}
                disabled={processing}
              >
                {processing ? "Processing..." : "Pay now"}
              </button>
            </div>
          </div>
        ) : null}

        {checkout.step >= 4 ? (
          <section className="status-card">
            <header>
              <h3>Transaction status</h3>
              <span className={`status-pill ${checkout.status ?? ""}`}>
                {checkout.status ?? "PENDING"}
              </span>
            </header>
            <div className="status-details">
              <div>
                <span>Transaction</span>
                <strong>{checkout.transactionId ?? "-"}</strong>
              </div>
              <div>
                <span>Reference</span>
                <strong>{checkout.reference ?? "-"}</strong>
              </div>
              <div>
                <span>Card</span>
                <strong>
                  {cardBrand ?? "Card"} {cardLast4 ? `**** ${cardLast4}` : ""}
                </strong>
              </div>
              <div>
                <span>Items</span>
                <strong>{totalItems}</strong>
              </div>
              <div>
                <span>Amount</span>
                <strong>{formatter.format(totalCents / 100)}</strong>
              </div>
            </div>
            {flowNotice ? <p className="muted">{flowNotice}</p> : null}
            {checkout.status && checkout.status !== "PENDING" ? (
              <p className="muted">Auto redirecting in a few seconds.</p>
            ) : null}
            <button className="btn btn-outline" onClick={handleBackToProduct}>
              Back to product page
            </button>
          </section>
        ) : null}
      </div>
    </div>
  );
};

export default ProductPage;
