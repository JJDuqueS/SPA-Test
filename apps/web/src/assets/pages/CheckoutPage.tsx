import React, { useEffect, useState } from "react";
import "./ProductPage.css";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import {
  setCard,
  setCustomer,
  setDelivery,
  setStep,
} from "../features/checkout/checkoutSlice";
import {
  detectCardBrand,
  formatCardNumber,
  getExpiryYear,
  luhnCheck,
} from "./checkoutHelpers";

const CheckoutPage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const checkout = useAppSelector((state) => state.checkout);
  const cart = checkout.cart ?? [];
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const cardDigits = checkout.card.cardNumber.replace(/\D/g, "");
  const cardBrand = detectCardBrand(cardDigits);

  useEffect(() => {
    if (cart.length === 0) {
      navigate("/");
      return;
    }
    dispatch(setStep(2));
  }, [cart.length, dispatch, navigate]);

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
    dispatch(setStep(3));
    navigate("/summary");
  };

  return (
    <div className="product-page">
      <div className="page-shell">
        <header className="page-header">
          <div>
            <p className="eyebrow">Checkout</p>
            <h1>Credit card and delivery info</h1>
          </div>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => navigate("/")}
          >
            Back to cart
          </button>
        </header>

        <form
          className="modal"
          id="checkout-form"
          onSubmit={handleInfoSubmit}
        >
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
                {formErrors.fullName ? <em>{formErrors.fullName}</em> : null}
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
                  <span className="brand-chip">{cardBrand ?? "VISA / MC"}</span>
                </div>
                {formErrors.cardNumber ? <em>{formErrors.cardNumber}</em> : null}
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
                {formErrors.expMonth ? <em>{formErrors.expMonth}</em> : null}
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

        </form>

        <div className="modal-actions">
          <button type="submit" form="checkout-form" className="btn btn-primary">
            Continue to summary
          </button>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
