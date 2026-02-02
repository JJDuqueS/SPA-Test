import { useEffect, useMemo, useState } from "react";
import "./ProductPage.css";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import {
  setStatus,
  setStep,
  setTransaction,
} from "../features/checkout/checkoutSlice";
import { applyStockUpdate } from "../features/product/productSlice";
import {
  detectCardBrand,
  tryCreateTransaction,
  tryUpdateTransaction,
  tryWompiPayment,
} from "./checkoutHelpers";
import { BASE_FEE_CENTS, DELIVERY_FEE_CENTS } from "./checkoutConstants";

const SummaryPage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const checkout = useAppSelector((state) => state.checkout);
  const cart = checkout.cart ?? [];
  const [processing, setProcessing] = useState(false);
  const [flowNotice, setFlowNotice] = useState<string | null>(null);

  useEffect(() => {
    if (cart.length === 0) {
      navigate("/");
      return;
    }
    dispatch(setStep(3));
  }, [cart.length, dispatch, navigate]);

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

  const cardDigits = checkout.card.cardNumber.replace(/\D/g, "");
  const cardBrand = detectCardBrand(cardDigits);
  const cardLast4 = cardDigits.slice(-4);

  const handlePayment = async () => {
    if (cart.length === 0 || processing) return;
    setProcessing(true);
    setFlowNotice(null);
    let nextFlowNotice: string | null = null;
    dispatch(setStatus("PENDING"));
    dispatch(setStep(4));

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
        dispatch(
          applyStockUpdate(
            cart.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
            }))
          )
        );
      }

      if (transaction.simulated || wompiResult.simulated) {
        nextFlowNotice =
          "Backend or Wompi endpoint not available, showing simulated flow."
        setFlowNotice(nextFlowNotice);
      }
    } catch (error) {
      dispatch(setStatus("ERROR"));
      nextFlowNotice = "Payment flow failed. Try again.";
      setFlowNotice(nextFlowNotice);
    } finally {
      setProcessing(false);
      navigate("/status", { state: { flowNotice: nextFlowNotice } });
    }
  };

  return (
    <div className="product-page">
      <div className="page-shell">
        <header className="page-header">
          <div>
            <p className="eyebrow">Checkout</p>
            <h1>Payment summary</h1>
          </div>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => navigate("/checkout")}
          >
            Edit info
          </button>
        </header>

        <div className="summary-card">
          <div className="summary-list">
            <div className="summary-items">
              {cart.map((item) => (
                <div className="summary-row" key={item.productId}>
                  <span>
                    {item.name} x{item.quantity}
                  </span>
                  <span>
                    {formatter.format((item.priceCents * item.quantity) / 100)}
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
          {flowNotice ? <p className="muted">{flowNotice}</p> : null}
          <button
            className="btn btn-primary"
            onClick={handlePayment}
            disabled={processing}
          >
            {processing ? "Processing..." : "Pay now"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SummaryPage;
