// Converts a Sale price in its original currency to EUR for read-time display.
//
// Sales are stored in their original currency (immutable history); conversion
// happens here, at read time, using today's rate. Only USD and EUR are
// supported initially — any other currency returns null so the caller can
// exclude it from EUR views rather than show a wrong number.
//
// `usdToEur` is the number of EUR per 1 USD (as returned by getEurToUsdRate).

export const convertToEur = (
  price: number,
  currency: string,
  usdToEur: number
): number | null => {
  const code = currency.trim().toUpperCase();

  switch (code) {
    case "EUR":
      return price;
    case "USD":
      return price * usdToEur;
    default:
      return null;
  }
};
