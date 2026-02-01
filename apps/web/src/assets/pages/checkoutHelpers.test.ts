import { HttpResponse, http } from "msw";
import { server } from "../../test/msw/server";
import {
  createLocalReference,
  detectCardBrand,
  formatCardNumber,
  getExpiryYear,
  luhnCheck,
  tryCreateTransaction,
  tryUpdateTransaction,
  tryWompiPayment,
} from "./checkoutHelpers";

describe("checkoutHelpers", () => {
  describe("formatCardNumber", () => {
    it("strips non-digits, groups by 4, and caps at 19 digits", () => {
      expect(formatCardNumber("4111-1111 1111 1111")).toBe(
        "4111 1111 1111 1111"
      );

      expect(formatCardNumber("4111 1111 1111 1111 9999")).toBe(
        "4111 1111 1111 1111 999"
      );
    });
  });

  describe("detectCardBrand", () => {
    it("detects VISA and MasterCard; returns null otherwise", () => {
      expect(detectCardBrand("4111111111111")).toBe("VISA");
      expect(detectCardBrand("4111111111111111")).toBe("VISA");
      expect(detectCardBrand("5555555555554444")).toBe("MASTERCARD");
      expect(detectCardBrand("123")).toBeNull();
    });
  });

  describe("luhnCheck", () => {
    it("returns true for valid numbers and false otherwise", () => {
      expect(luhnCheck("4111111111111111")).toBe(true);
      expect(luhnCheck("4111111111111112")).toBe(false);
      expect(luhnCheck("4111a")).toBe(false);
    });
  });

  describe("getExpiryYear", () => {
    it("supports 2-digit and 4-digit years", () => {
      expect(getExpiryYear("25")).toBe(2025);
      expect(getExpiryYear(" 30 ")).toBe(2030);
      expect(getExpiryYear("2028")).toBe(2028);
    });
  });

  describe("createLocalReference", () => {
    it("creates deterministic-looking refs", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.123456);
      expect(createLocalReference()).toMatch(/^REF-[A-Z0-9]{6}$/);
    });
  });

  describe("tryCreateTransaction", () => {
    it("uses backend response when available", async () => {
      const result = await tryCreateTransaction({ amountCents: 1000 });
      expect(result).toEqual({
        transactionId: "tx_test_123",
        reference: "REF-TEST123",
        simulated: false,
      });
    });

    it("falls back to simulated flow when backend errors", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
      vi.spyOn(Math, "random").mockReturnValue(0.123456);
      const expectedReference = createLocalReference();

      server.use(
        http.post("http://localhost:3000/transactions", async () => {
          return new HttpResponse(null, { status: 500 });
        })
      );

      const result = await tryCreateTransaction({ amountCents: 1000 });
      expect(result.simulated).toBe(true);
      expect(result.transactionId).toBe("tx_1767225600000");
      expect(result.reference).toBe(expectedReference);

      vi.useRealTimers();
    });
  });

  describe("tryUpdateTransaction", () => {
    it("returns simulated:false when backend update succeeds", async () => {
      const result = await tryUpdateTransaction("tx_test_123", {
        status: "APPROVED",
      });
      expect(result).toEqual({ simulated: false });
    });

    it("returns simulated:true when backend update fails", async () => {
      server.use(
        http.patch(
          "http://localhost:3000/transactions/:transactionId",
          async () => {
            return new HttpResponse(null, { status: 500 });
          }
        )
      );

      const result = await tryUpdateTransaction("tx_test_123", {
        status: "APPROVED",
      });
      expect(result).toEqual({ simulated: true });
    });
  });

  describe("tryWompiPayment", () => {
    it("falls back to simulated approval when the endpoint errors", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));

      const result = await tryWompiPayment({ amountCents: 1000 });
      expect(result).toEqual({
        status: "APPROVED",
        providerTxId: "wompi_1767225600000",
        simulated: true,
      });

      vi.useRealTimers();
    });

    it("returns provider status when the endpoint succeeds", async () => {
      server.use(
        http.post("http://localhost:3000/wompi", async () => {
          return HttpResponse.json({
            status: "DECLINED",
            id: "wompi_test_1",
          });
        })
      );

      const result = await tryWompiPayment({ amountCents: 1000 });
      expect(result).toEqual({
        status: "DECLINED",
        providerTxId: "wompi_test_1",
        simulated: false,
      });
    });
  });
});
