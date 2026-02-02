import { useEffect } from "react";
import "./ProductPage.css";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { clearCart, resetCheckout, setStep } from "../features/checkout/checkoutSlice";
import { BASE_FEE_CENTS, DELIVERY_FEE_CENTS } from "./checkoutConstants";
import { detectCardBrand } from "./checkoutHelpers";

const StatusPage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const checkout = useAppSelector((state) => state.checkout);
  const cart = checkout.cart ?? [];
  const flowNotice = (location.state as { flowNotice?: string } | null)
    ?.flowNotice;

  useEffect(() => {
    if (!checkout.status) {
      navigate("/");
      return;
    }
    dispatch(setStep(4));
    const timeout = window.setTimeout(() => {
      dispatch(resetCheckout());
      dispatch(clearCart());
      navigate("/");
    }, 6000);
    return () => window.clearTimeout(timeout);
  }, [checkout.status, dispatch, navigate]);

  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  });
  const cartSubtotalCents = cart.reduce(
    (sum, item) => sum + item.priceCents * item.quantity,
    0
  );
  const totalCents =
    cartSubtotalCents + BASE_FEE_CENTS + DELIVERY_FEE_CENTS;
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cardDigits = checkout.card.cardNumber.replace(/\D/g, "");
  const cardBrand = detectCardBrand(cardDigits);
  const cardLast4 = cardDigits.slice(-4);

  return (
    <div className="product-page">
      <div className="page-shell">
        <header className="page-header">
          <div>
            <p className="eyebrow">Checkout</p>
            <h1>Transaction status</h1>
          </div>
        </header>

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
          <p className="muted">Auto redirecting in a few seconds.</p>
          <button
            className="btn btn-outline"
            onClick={() => {
              dispatch(resetCheckout());
              dispatch(clearCart());
              navigate("/");
            }}
          >
            Back to product page
          </button>
        </section>
      </div>
    </div>
  );
};

export default StatusPage;
