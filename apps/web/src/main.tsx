import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { store, persistor } from "./assets/app/store";
import "./index.css";
import { BrowserRouter } from "react-router-dom";
import AppRouter from "./assets/routes/AppRouter";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <BrowserRouter>
          <AppRouter />
        </BrowserRouter>
      </PersistGate>
    </Provider>
  </React.StrictMode>
);
