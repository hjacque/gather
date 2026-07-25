import {
  buildEbayQuery,
  cleanFullName,
  extractCoreName,
  normalizeName,
  stripSetWords,
} from "./ebayQuery";

describe("normalizeName", () => {
  it("lowercases and turns separators into single spaces", () => {
    expect(normalizeName("Full Art/Cramorant Pokemon Stamp Box")).toBe(
      "full art cramorant pokemon stamp box"
    );
    expect(normalizeName("Maiko-Han Pikachu/Okuge-Sama Pikachu")).toBe(
      "maiko han pikachu okuge sama pikachu"
    );
  });

  it("drops the possessive 's so it reads like a search", () => {
    expect(normalizeName("Yokohama's Pikachu")).toBe("yokohama pikachu");
    expect(normalizeName("Rescue Team DX's Pikachu")).toBe("rescue team dx pikachu");
  });

  it("glues a remaining apostrophe so species slugs still match", () => {
    expect(normalizeName("Farfetch'd")).toBe("farfetchd");
  });
});

describe("extractCoreName", () => {
  it("keeps everything up to and including the first species, dropping the set", () => {
    expect(extractCoreName("Full Art/Cramorant Pokemon Stamp Box")).toBe("cramorant");
    expect(extractCoreName("Eevee Munch: A Retrospective")).toBe("eevee");
    expect(extractCoreName("Warm Pikachu Uniqlo Kids")).toBe("warm pikachu");
    expect(extractCoreName("Yokohama's Pikachu Pokemon Center Yokohama Special Box")).toBe(
      "yokohama pikachu"
    );
  });

  it("retains the variant prefix that precedes the species", () => {
    expect(extractCoreName("Poncho-Wearing Pikachu Rayquaza Poncho-Wearing Pikachu Box")).toBe(
      "poncho wearing pikachu"
    );
    expect(extractCoreName("Pretend Boss Pikachu Team Skull-Team Rainbow Rocket's Ambition")).toBe(
      "pretend boss pikachu"
    );
  });

  it("matches the earliest species when several are named", () => {
    expect(extractCoreName("Pretend Gyarados Pikachu Holo")).toBe("pretend gyarados");
  });

  it("falls back to the full cleaned name when no species is present", () => {
    expect(extractCoreName("Victory Medal 1st Place-Gym Challenge")).toBe(
      "victory medal 1st place gym challenge"
    );
    expect(extractCoreName("Pokemon Pal City Summer Battle Road-Kanto")).toBe(
      "pal city summer battle road kanto"
    );
  });
});

describe("cleanFullName (the 'full' strategy)", () => {
  it("strips boilerplate but keeps the set/box descriptor", () => {
    expect(cleanFullName("Full Art/Cramorant Pokemon Stamp Box")).toBe("cramorant stamp box");
  });
});

describe("stripSetWords (the 'strip-set' strategy)", () => {
  it("also removes set/box/store vocabulary", () => {
    expect(stripSetWords("Full Art/Cramorant Pokemon Stamp Box")).toBe("cramorant");
    expect(stripSetWords("Warm Pikachu Uniqlo Kids")).toBe("warm pikachu");
  });
});

describe("buildEbayQuery", () => {
  it("renders <core> <number> psa <year>", () => {
    expect(buildEbayQuery("Full Art/Cramorant Pokemon Stamp Box", "226", 2021)).toBe(
      "cramorant 226 psa 2021"
    );
  });

  it("honors a non-default strategy", () => {
    expect(buildEbayQuery("Full Art/Cramorant Pokemon Stamp Box", "226", 2021, "full")).toBe(
      "cramorant stamp box 226 psa 2021"
    );
  });

  it("omits a missing number and year without leaving gaps", () => {
    expect(buildEbayQuery("Pikachu-Holo Illustrator", null, 1998)).toBe(
      "pikachu psa 1998"
    );
    expect(buildEbayQuery("Mysterious Pearl", null, null)).toBe("mysterious pearl psa");
  });
});
