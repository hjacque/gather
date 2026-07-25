import { RateLimitError, isRateLimitedBody } from "./rateLimit";
import { TerapeakRateLimitError } from "./terapeakSales.source";

describe("isRateLimitedBody", () => {
  it("detects the eBay interruption page", () => {
    expect(isRateLimitedBody("Pardon Our Interruption")).toBe(true);
  });

  it("detects an explicit rate limit notice", () => {
    expect(isRateLimitedBody("You are being rate limited")).toBe(true);
  });

  it("ignores a normal page", () => {
    expect(isRateLimitedBody("PSA 10 Charizard — 12 results")).toBe(false);
  });
});

describe("TerapeakRateLimitError", () => {
  it("is a RateLimitError so sync loops abort on it", () => {
    expect(new TerapeakRateLimitError("Charizard @50")).toBeInstanceOf(
      RateLimitError
    );
  });
});
