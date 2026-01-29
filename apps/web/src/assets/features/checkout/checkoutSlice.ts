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

interface CheckoutState {
  step: number;
  customer: CustomerForm;
  delivery: DeliveryForm;
  card: CardForm;
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
  setTransaction,
  setStatus,
  resetCheckout,
} = checkoutSlice.actions;

export default checkoutSlice.reducer;
