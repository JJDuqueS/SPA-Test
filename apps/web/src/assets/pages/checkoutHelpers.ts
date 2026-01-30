const API_URL = import.meta.env.VITE_API_URL ?? "";
const WOMPI_ENDPOINT = import.meta.env.VITE_WOMPI_ENDPOINT ?? "";

export const formatCardNumber = (value: string) =>
  value
    .replace(/\D/g, "")
    .slice(0, 19)
    .replace(/(\d{4})(?=\d)/g, "$1 ");

export const detectCardBrand = (digits: string) => {
  const visa = /^4\d{12}(\d{3})?(\d{3})?$/.test(digits);
  const mastercard =
    /^(5[1-5]\d{14}|2(2[2-9]\d{12}|[3-6]\d{13}|7[01]\d{12}|720\d{12}))$/.test(
      digits
    );
  if (visa) return "VISA";
  if (mastercard) return "MASTERCARD";
  return null;
};

export const luhnCheck = (value: string) => {
  let sum = 0;
  let shouldDouble = false;
  for (let i = value.length - 1; i >= 0; i -= 1) {
    let digit = Number.parseInt(value.charAt(i), 10);
    if (Number.isNaN(digit)) return false;
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
};

export const getExpiryYear = (value: string) => {
  const trimmed = value.trim();
  if (trimmed.length === 2) {
    return 2000 + Number.parseInt(trimmed, 10);
  }
  return Number.parseInt(trimmed, 10);
};

export const createLocalReference = () =>
  `REF-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

export const tryCreateTransaction = async (payload: Record<string, unknown>) => {
  const fallback = {
    transactionId: `tx_${Date.now()}`,
    reference: createLocalReference(),
    simulated: true,
  };
  if (!API_URL) return fallback;
  try {
    const res = await fetch(`${API_URL}/transactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("create transaction failed");
    const data = await res.json();
    return {
      transactionId: data.id ?? data.transactionId ?? fallback.transactionId,
      reference: data.reference ?? data.ref ?? fallback.reference,
      simulated: false,
    };
  } catch {
    return fallback;
  }
};

export const tryUpdateTransaction = async (
  transactionId: string,
  payload: Record<string, unknown>
) => {
  if (!API_URL) return { simulated: true };
  try {
    const res = await fetch(`${API_URL}/transactions/${transactionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("update transaction failed");
    return { simulated: false };
  } catch {
    return { simulated: true };
  }
};

export const tryWompiPayment = async (payload: Record<string, unknown>) => {
  const fallback = {
    status: "APPROVED" as const,
    providerTxId: `wompi_${Date.now()}`,
    simulated: true,
  };
  if (!WOMPI_ENDPOINT) return fallback;
  try {
    const res = await fetch(WOMPI_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("wompi failed");
    const data = await res.json();
    return {
      status: data.status ?? fallback.status,
      providerTxId: data.id ?? data.transactionId ?? fallback.providerTxId,
      simulated: false,
    };
  } catch {
    return fallback;
  }
};
