import React, { type PropsWithChildren } from "react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { render, type RenderOptions } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import productReducer from "../../assets/features/product/productSlice";
import checkoutReducer from "../../assets/features/checkout/checkoutSlice";

export const makeTestStore = (preloadedState?: unknown) => {
  return configureStore({
    reducer: {
      product: productReducer,
      checkout: checkoutReducer,
    },
    preloadedState,
  });
};

export const renderWithProviders = (
  ui: React.ReactElement,
  options?: {
    route?: string;
    preloadedState?: unknown;
    store?: ReturnType<typeof makeTestStore>;
    renderOptions?: Omit<RenderOptions, "wrapper">;
  }
) => {
  const store = options?.store ?? makeTestStore(options?.preloadedState);
  const route = options?.route ?? "/";

  const Wrapper = ({ children }: PropsWithChildren) => (
    <Provider store={store}>
      <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
    </Provider>
  );

  return {
    store,
    ...render(ui, { wrapper: Wrapper, ...options?.renderOptions }),
  };
};

