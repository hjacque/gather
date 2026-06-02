import { convertToEur } from "./eurConverter";

describe("convertToEur", () => {
  const usdToEur = 0.9;

  it("returns EUR prices unchanged", () => {
    expect(convertToEur(100, "EUR", usdToEur)).toBe(100);
  });

  it("converts USD prices using the supplied rate", () => {
    expect(convertToEur(100, "USD", usdToEur)).toBe(90);
  });

  it("is case- and whitespace-insensitive on the currency code", () => {
    expect(convertToEur(100, "usd", usdToEur)).toBe(90);
    expect(convertToEur(100, " Eur ", usdToEur)).toBe(100);
  });

  it("returns null for unsupported currencies", () => {
    expect(convertToEur(100, "GBP", usdToEur)).toBeNull();
    expect(convertToEur(100, "JPY", usdToEur)).toBeNull();
  });

  it("preserves zero prices without treating them as missing", () => {
    expect(convertToEur(0, "USD", usdToEur)).toBe(0);
  });
});
