import React from "react";
import { Routes, Route } from "react-router-dom";
import ProductPage from "../pages/ProductPage";

const AppRouter = () => {
  return (
    <Routes>
      <Route path="/" element={<ProductPage />} />
      {/* <Route path="/checkout" element={<CheckoutPage />} />
      <Route path="/summary" element={<SummaryPage />} />
      <Route path="/status" element={<StatusPage />} />  */}
    </Routes>
  );
};

export default AppRouter;
