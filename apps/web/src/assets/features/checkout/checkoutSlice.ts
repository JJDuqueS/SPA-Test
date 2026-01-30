import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface CustomerForm {
  fullName: string;
  email: string;
  phone: string;
}

interface DeliveryForm {
  addressLine1: string;
  city: string;
  state: string;
  postalCode: string;
  notes: string;
}

interface CardForm {
  cardNumber: string;
  expMonth: string;
  expYear: string;
  cvc: string;
  holderName: string;
}

export interface CartItem {
  productId: string;
  name: string;
  priceCents: number;
  quantity: number;
  imageUrl?: string;
}

interface CheckoutState {
  step: number;
  customer: CustomerForm;
  delivery: DeliveryForm;
  card: CardForm;
  cart: CartItem[];
  transactionId: string | null;
  reference: string | null;
  status: "PENDING" | "APPROVED" | "DECLINED" | "ERROR" | null;
}

const initialState: CheckoutState = {
  step: 1,
  customer: {
    fullName: "",
    email: "",
    phone: "",
  },
  delivery: {
    addressLine1: "",
    city: "",
    state: "",
    postalCode: "",
    notes: "",
  },
  card: {
    cardNumber: "",
    expMonth: "",
    expYear: "",
    cvc: "",
    holderName: "",
  },
  cart: [],
  transactionId: null,
  reference: null,
  status: null,
};

export const checkoutSlice = createSlice({
  name: "checkout",
  initialState,
  reducers: {
    setStep: (state, action: PayloadAction<number>) => {
      state.step = action.payload;
    },
    setCustomer: (state, action: PayloadAction<CustomerForm>) => {
      state.customer = action.payload;
    },
    setDelivery: (state, action: PayloadAction<DeliveryForm>) => {
      state.delivery = action.payload;
    },
    setCard: (state, action: PayloadAction<CardForm>) => {
      state.card = action.payload;
    },
    addToCart: (state, action: PayloadAction<CartItem>) => {
      const existing = state.cart.find(
        (item) => item.productId === action.payload.productId
      );
      if (existing) {
        existing.quantity += action.payload.quantity;
      } else {
        state.cart.push(action.payload);
      }
    },
    updateCartQuantity: (
      state,
      action: PayloadAction<{ productId: string; quantity: number }>
    ) => {
      const item = state.cart.find(
        (entry) => entry.productId === action.payload.productId
      );
      if (!item) return;
      item.quantity = Math.max(1, action.payload.quantity);
    },
    removeFromCart: (state, action: PayloadAction<string>) => {
      state.cart = state.cart.filter(
        (item) => item.productId !== action.payload
      );
    },
    clearCart: (state) => {
      state.cart = [];
    },
    setTransaction: (
      state,
      action: PayloadAction<{ transactionId: string; reference: string }>
    ) => {
      state.transactionId = action.payload.transactionId;
      state.reference = action.payload.reference;
    },
    setStatus: (
      state,
      action: PayloadAction<
        "PENDING" | "APPROVED" | "DECLINED" | "ERROR" | null
      >
    ) => {
      state.status = action.payload;
    },
    resetCheckout: () => initialState,
  },
});

export const {
  setStep,
  setCustomer,
  setDelivery,
  setCard,
  addToCart,
  updateCartQuantity,
  removeFromCart,
  clearCart,
  setTransaction,
  setStatus,
  resetCheckout,
} = checkoutSlice.actions;

export default checkoutSlice.reducer;
