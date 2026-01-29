import { configureStore, combineReducers } from "@reduxjs/toolkit";
import productReducer from "../features/product/productSlice";
import checkoutReducer from "../features/checkout/checkoutSlice";
import storage from "redux-persist/lib/storage";
import { persistReducer, persistStore } from "redux-persist";

const rootReducer = combineReducers({
  product: productReducer,
  checkout: checkoutReducer,
});

const persistConfig = {
  key: "root",
  storage,
  whitelist: ["checkout"], // persistimos solo el flujo
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefault) =>
    getDefault({
      serializableCheck: false, // por redux-persist
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
