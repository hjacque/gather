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
