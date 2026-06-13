import { extractTerapeakRow, RawTerapeakRow } from "./terapeakRowExtractor";

const row = (over: Partial<RawTerapeakRow> = {}): RawTerapeakRow => ({
  itemId: "126373873770",
  title: "PSA 10 Gem Mint Gentlemanly Pikachu 210 Promo Pokemon",
  priceText: "$303.99 Fixed price",
  soldCountText: "1",
  soldText: "Aug 24, 2024",
  ...over,
});

describe("extractTerapeakRow", () => {
  it("extracts a single-sale candidate with title, price and date", () => {
    expect(extractTerapeakRow(row())).toEqual({
      itemId: "126373873770",
      title: "PSA 10 Gem Mint Gentlemanly Pikachu 210 Promo Pokemon",
      price: 303.99,
      currency: "USD",
      soldAt: new Date("2024-08-24T00:00:00Z"),
      soldCount: 1,
    });
  });

  it("parses a thousands-separated auction price", () => {
    expect(extractTerapeakRow(row({ priceText: "$3,025.00 Auction" }))).toMatchObject({
      price: 3025,
      currency: "USD",
    });
  });

  it("carries the sold count for aggregated rows", () => {
    expect(extractTerapeakRow(row({ soldCountText: "5" }))?.soldCount).toBe(5);
  });

  it("defaults a missing/blank sold count to 1", () => {
    expect(extractTerapeakRow(row({ soldCountText: "" }))?.soldCount).toBe(1);
  });

  it("returns null when the item id is missing or non-numeric", () => {
    expect(extractTerapeakRow(row({ itemId: null }))).toBeNull();
    expect(extractTerapeakRow(row({ itemId: "abc" }))).toBeNull();
  });

  it("returns null when the title is empty", () => {
    expect(extractTerapeakRow(row({ title: "" }))).toBeNull();
  });

  it("returns null when the price is unparseable", () => {
    expect(extractTerapeakRow(row({ priceText: "Fixed price" }))).toBeNull();
  });

  it("returns null when the sold date is unparseable", () => {
    expect(extractTerapeakRow(row({ soldText: "" }))).toBeNull();
  });
});
