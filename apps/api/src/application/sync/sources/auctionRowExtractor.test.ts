import {
  extractAuctionRow,
  parseBidCount,
  parseTimeLeft,
  RawAuctionRow,
} from "./auctionRowExtractor";

const NOW = new Date("2026-06-18T12:00:00.000Z");

describe("parseTimeLeft", () => {
  it("adds French day/hour tokens to now", () => {
    const end = parseTimeLeft("1 j 4 h", NOW)!;
    expect(end.getTime()).toBe(NOW.getTime() + 28 * 60 * 60 * 1000);
  });

  it("parses hours and minutes", () => {
    const end = parseTimeLeft("4 h 30 min", NOW)!;
    expect(end.getTime()).toBe(NOW.getTime() + (4 * 60 + 30) * 60 * 1000);
  });

  it("parses minutes and seconds", () => {
    const end = parseTimeLeft("30 min 12 s", NOW)!;
    expect(end.getTime()).toBe(NOW.getTime() + (30 * 60 + 12) * 1000);
  });

  it("ignores a 'Se termine dans' prefix", () => {
    const end = parseTimeLeft("Se termine dans 2 j", NOW)!;
    expect(end.getTime()).toBe(NOW.getTime() + 2 * 24 * 60 * 60 * 1000);
  });

  it("accepts the English shape", () => {
    const end = parseTimeLeft("1d 4h", NOW)!;
    expect(end.getTime()).toBe(NOW.getTime() + 28 * 60 * 60 * 1000);
  });

  it("returns null for an empty or token-less caption", () => {
    expect(parseTimeLeft(null, NOW)).toBeNull();
    expect(parseTimeLeft("Aujourd'hui", NOW)).toBeNull();
  });
});

describe("parseBidCount", () => {
  it("reads a French bid count", () => {
    expect(parseBidCount("5 enchères")).toBe(5);
    expect(parseBidCount("1 enchère")).toBe(1);
  });

  it("reads an English bid count", () => {
    expect(parseBidCount("12 bids")).toBe(12);
    expect(parseBidCount("1 bid")).toBe(1);
  });

  it("treats 'no bids' as zero", () => {
    expect(parseBidCount("Aucune enchère")).toBe(0);
    expect(parseBidCount("0 bids")).toBe(0);
  });

  it("returns null when the caption is absent or unrecognized", () => {
    expect(parseBidCount(null)).toBeNull();
    expect(parseBidCount("livraison gratuite")).toBeNull();
  });
});

describe("extractAuctionRow", () => {
  const base: RawAuctionRow = {
    listingId: "115888888888",
    title: "Pokemon Cramorant 226 PSA 10",
    priceText: "12,50 EUR",
    bidText: "3 enchères",
    timeLeftText: "1 j 4 h",
    sellerHref: null,
    sellerInfoText: null,
    locationText: "de Allemagne",
  };

  it("extracts the current bid, bid count, end time, and EU location", () => {
    const c = extractAuctionRow(base, NOW)!;
    expect(c.itemId).toBe("115888888888");
    expect(c.currentBid).toBe(12.5);
    expect(c.currency).toBe("EUR");
    expect(c.bidCount).toBe(3);
    expect(c.endTime.getTime()).toBe(NOW.getTime() + 28 * 60 * 60 * 1000);
    expect(c.location).toBe("Allemagne");
    expect(c.isEuLocation).toBe(true);
  });

  it("defaults an unknown bid caption to zero bids", () => {
    const c = extractAuctionRow({ ...base, bidText: null }, NOW)!;
    expect(c.bidCount).toBe(0);
  });

  it("flags a non-EU location", () => {
    const c = extractAuctionRow({ ...base, locationText: "de Japon" }, NOW)!;
    expect(c.isEuLocation).toBe(false);
  });

  it("rejects a row with no parseable end time (not a live auction row)", () => {
    expect(extractAuctionRow({ ...base, timeLeftText: null }, NOW)).toBeNull();
  });

  it("rejects a row with no id or no price", () => {
    expect(extractAuctionRow({ ...base, listingId: null }, NOW)).toBeNull();
    expect(extractAuctionRow({ ...base, priceText: "" }, NOW)).toBeNull();
  });
});
