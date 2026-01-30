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
  products: Product[];
  product: Product | null;
  loading: boolean;
  error: string | null;
}

const initialState: ProductState = {
  products: [],
  product: null,
  loading: false,
  error: null,
};

// Async thunk to fetch products list
export const fetchProducts = createAsyncThunk("product/fetchAll", async () => {
  const res = await fetch(`${import.meta.env.VITE_API_URL}/products`);
  const data = await res.json();
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.products)) return data.products;
  return [];
});

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
      .addCase(fetchProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.products = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchProducts.rejected, (state) => {
        state.loading = false;
        state.error = "Failed to fetch products";
      })
      .addCase(fetchProductById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProductById.fulfilled, (state, action) => {
        state.loading = false;
        state.product = action.payload;
        if (action.payload?.id) {
          const existing = state.products.find(
            (item) => item.id === action.payload.id
          );
          if (existing) {
            Object.assign(existing, action.payload);
          } else {
            state.products.push(action.payload);
          }
        }
      })
      .addCase(fetchProductById.rejected, (state) => {
        state.loading = false;
        state.error = "Failed to fetch product";
      });
  },
});

export default productSlice.reducer;
