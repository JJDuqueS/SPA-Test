import userEvent from "@testing-library/user-event";
import { screen } from "@testing-library/react";
import AppRouter from "./AppRouter";
import { renderWithProviders } from "../../test/utils/renderWithProviders";

describe("checkout flow", () => {
  it("navigates /checkout → /summary → /status and shows an approved transaction", async () => {
    const preloadedState = {
      product: {
        products: [],
        product: null,
        loading: false,
        error: null,
      },
      checkout: {
        step: 1,
        customer: {
          fullName: "Jane Doe",
          email: "jane@example.com",
          phone: "5551234567",
        },
        delivery: {
          addressLine1: "123 Main St",
          city: "Miami",
          state: "FL",
          postalCode: "33101",
          notes: "",
        },
        card: {
          cardNumber: "4111 1111 1111 1111",
          expMonth: "12",
          expYear: "30",
          cvc: "123",
          holderName: "JANE DOE",
        },
        cart: [
          {
            productId: "p-1",
            name: "Product 1",
            priceCents: 1000,
            quantity: 2,
            imageUrl: "",
          },
        ],
        transactionId: null,
        reference: null,
        status: null,
      },
    };

    const user = userEvent.setup();
    renderWithProviders(<AppRouter />, {
      route: "/checkout",
      preloadedState,
    });

    expect(
      screen.getByRole("heading", { name: /credit card and delivery info/i })
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /continue to summary/i })
    );

    expect(
      await screen.findByRole("heading", { name: /payment summary/i })
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /pay now/i }));

    expect(
      await screen.findByRole("heading", {
        name: /transaction status/i,
        level: 1,
      })
    ).toBeInTheDocument();

    expect(screen.getByText("APPROVED")).toBeInTheDocument();
    expect(screen.getByText("tx_test_123")).toBeInTheDocument();
    expect(screen.getByText("REF-TEST123")).toBeInTheDocument();
    expect(screen.getByText(/visa/i)).toBeInTheDocument();
    expect(screen.getByText(/\*{4}\s1111/)).toBeInTheDocument();

    expect(
      screen.getByText(
        /backend or wompi endpoint not available, showing simulated flow\./i
      )
    ).toBeInTheDocument();
  });
});
