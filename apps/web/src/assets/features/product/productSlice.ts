import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

export interface Product {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  priceCents: number;
  stock: number;
}

interface ProductState {
  product: Product | null;
  loading: boolean;
  error: string | null;
}

const initialState: ProductState = {
  product: null,
  loading: false,
  error: null,
};

// Async thunk to fetch product by id
export const fetchProductById = createAsyncThunk(
  "product/fetchById",
  async (id: string) => {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/products/${id}`);
    const data = await res.json();
    return data;
  }
);

export const productSlice = createSlice({
  name: "product",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchProductById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProductById.fulfilled, (state, action) => {
        state.loading = false;
        state.product = action.payload;
      })
      .addCase(fetchProductById.rejected, (state) => {
        state.loading = false;
        state.error = "Failed to fetch product";
      });
  },
});

export default productSlice.reducer;
