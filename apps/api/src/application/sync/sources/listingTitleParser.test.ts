import { parseListingTitle, TargetCard } from "./listingTitleParser";

const CRAMORANT_226: TargetCard = { number: "226" };

describe("parseListingTitle", () => {
  describe("real single-card titles → accepted with the right grade", () => {
    const acceptedPsa10 = [
      "2021 POKEMON JAPANESE S PROMO POKEMON STAMP BOX #226 FULL ART/CRAMORANT PSA 10",
      "Pokemon Cramorant P.M. Stamp Bx. Japanese Full Art Promo 226/S-P PSA 10 Gem Mint",
      "FA/CRAMORANT POKEMON STAMP BOX PROMO 226 2021 JAPANESE PSA 10",
      "2021 Pokemon SWSH S-P Promos Japanese Cramorant Stamp Box #226/S-P PSA 10",
    ];

    it.each(acceptedPsa10)("accepts PSA 10: %s", (title) => {
      expect(parseListingTitle(title, CRAMORANT_226)).toEqual({
        kind: "accepted",
        grade: 10,
      });
    });

    it("does not mistake a 4-digit release year for a card number", () => {
      expect(
        parseListingTitle(
          "FA/CRAMORANT POKEMON STAMP BOX PROMO 226 2021 JAPANESE PSA 10",
          CRAMORANT_226
        )
      ).toEqual({ kind: "accepted", grade: 10 });
    });

    it("does not mistake a seller SKU (e.g. Q0895) for a card number", () => {
      expect(
        parseListingTitle(
          "CRAMORANT 2021 POKEMON JPN S-P STAMP BOX PROMO ALT ART PSA 10 #226 Q0895",
          CRAMORANT_226
        )
      ).toEqual({ kind: "accepted", grade: 10 });
    });

    it("does not mistake an autograph grade (AUTO 10) for a card number", () => {
      expect(
        parseListingTitle(
          "Cramorant 226/S-P Stamp Box Mitsuhiro Arita Signed PSA10 AUTO10",
          CRAMORANT_226
        )
      ).toEqual({ kind: "accepted", grade: 10 });
    });
  });

  describe("grade extraction across grades and spacing", () => {
    it.each([
      ["Cramorant 226/S-P Stamp Box Promo PSA 9", 9],
      ["Cramorant 226/S-P Stamp Box Promo PSA8", 8],
      ["PSA   7 Cramorant 226 Stamp Box Promo Japanese", 7],
      ["psa10 Cramorant 226/S-P Stamp Box Promo", 10],
    ])("extracts the grade from %s", (title, grade) => {
      expect(parseListingTitle(title, CRAMORANT_226)).toEqual({
        kind: "accepted",
        grade,
      });
    });
  });

  describe("rejects titles with no PSA grade", () => {
    it.each([
      "Cramorant 226/S-P Stamp Box Promo Japanese Pokemon Card Near Mint",
      "2021 Pokemon Japanese Cramorant Stamp Box #226 Ungraded",
      "",
    ])("skips no-grade: %s", (title) => {
      expect(parseListingTitle(title, CRAMORANT_226)).toEqual({
        kind: "skipped",
        reason: "no-grade",
      });
    });
  });

  describe("rejects mixed-grade (multi-card) titles", () => {
    it.each([
      "PSA 10 Pikachu 227 Stamp Box Full Art Promo 2021 Pokemon PSA 9 Cramorant 226",
      "Pikachu 227/S-P PSA 9 Cramorant 226/S-P PSA 10 Pokemon Stamp Promo Seq. FULL SET",
      "【Full set】 PSA 10 Pikachu 227 PSA 9 Cramorant 226 Stamp Box PROMO With Box",
    ])("skips multi-grade: %s", (title) => {
      expect(parseListingTitle(title, CRAMORANT_226)).toEqual({
        kind: "skipped",
        reason: "multi-grade",
      });
    });
  });

  describe("rejects lots / bundles by keyword", () => {
    it.each([
      "PSA 10 Pikachu 227 Cramorant 226 Stamp Box Set PROMO Pokemon Beauty Back 2021 JP",
      "PSA 10 Pikachu Cramorant 226/227-P sequential w/Stamp Box Pokemon Card Japan",
      "Pokémon Pikachu 227/S-P & 226/S-P Cramorant JPN Sword & Shield Promo PSA 10",
      "PSA 10 Pikachu 227/S-P Stamp Cramorant 226/S-P SEQUENTIAL Japanese Pokemon",
    ])("skips bundle: %s", (title) => {
      expect(parseListingTitle(title, CRAMORANT_226)).toEqual({
        kind: "skipped",
        reason: "bundle",
      });
    });
  });

  describe("rejects multi-card sets that name a foreign card number", () => {
    it.each([
      "PSA10 Pikachu 227/S-P Cramorant 226/S-P Stamp Box Promo Japanese Pokemon Card",
      "PSA 10 Pikachu Cramorant 226/S-P 227/S-P Stamp Box Promo Pokemon Card Japanese",
      "Pikachu Cramorant 226/S-P 227/S-P Stamp Box Promo Pokemon Japanese PSA 10",
      "[PSA 10] Pokemon Japanese Beauty Back Moon Pikachu 227/S-P Cramorant 226/S-P",
    ])("skips foreign-card: %s", (title) => {
      expect(parseListingTitle(title, CRAMORANT_226)).toEqual({
        kind: "skipped",
        reason: "foreign-card",
      });
    });

    it("skips the foreign check when the target Card has no number", () => {
      expect(
        parseListingTitle(
          "PSA10 Pikachu 227/S-P Cramorant 226/S-P Stamp Box Promo",
          { number: null }
        )
      ).toEqual({ kind: "accepted", grade: 10 });
    });
  });
});
