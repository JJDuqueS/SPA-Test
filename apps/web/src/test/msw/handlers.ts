import { http, HttpResponse } from "msw";

const API_URL = "http://localhost:3000";

export const handlers = [
  http.post(`${API_URL}/transactions`, async () => {
    return HttpResponse.json({ id: "tx_test_123", reference: "REF-TEST123" });
  }),
  http.patch(`${API_URL}/transactions/:transactionId`, async () => {
    return HttpResponse.json({ ok: true });
  }),
  http.get(`${API_URL}/products`, async () => {
    return HttpResponse.json([
      {
        id: "p-1",
        name: "Product 1",
        description: "Test product",
        imageUrl: "",
        priceCents: 1000,
        stock: 10,
      },
    ]);
  }),
  http.post(`${API_URL}/wompi`, async () => {
    return new HttpResponse(null, { status: 500 });
  }),
];

