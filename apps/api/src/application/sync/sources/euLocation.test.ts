import {
  isEuCountry,
  isEuLocationText,
  parseListingLocation,
  toEnglishCountry,
} from "./euLocation";

describe("parseListingLocation", () => {
  it("strips the 'de' article eBay.fr prefixes the location with", () => {
    expect(parseListingLocation("de Allemagne")).toBe("Allemagne");
    expect(parseListingLocation("de États-Unis")).toBe("États-Unis");
    expect(parseListingLocation("de Royaume-Uni")).toBe("Royaume-Uni");
  });

  it("tolerates the other article forms and a bare country", () => {
    expect(parseListingLocation("du Japon")).toBe("Japon");
    expect(parseListingLocation("d'Espagne")).toBe("Espagne");
    expect(parseListingLocation("Italie")).toBe("Italie");
  });

  it("returns null for empty input", () => {
    expect(parseListingLocation(null)).toBeNull();
    expect(parseListingLocation("")).toBeNull();
    expect(parseListingLocation("de ")).toBeNull();
  });
});

describe("isEuCountry", () => {
  it("accepts EU member states regardless of accents/case", () => {
    expect(isEuCountry("Allemagne")).toBe(true);
    expect(isEuCountry("italie")).toBe(true);
    expect(isEuCountry("Grèce")).toBe(true);
    expect(isEuCountry("Grece")).toBe(true);
    expect(isEuCountry("République tchèque")).toBe(true);
  });

  it("rejects non-EU locations from the live capture", () => {
    expect(isEuCountry("Japon")).toBe(false);
    expect(isEuCountry("États-Unis")).toBe(false);
    // UK is non-EU post-Brexit.
    expect(isEuCountry("Royaume-Uni")).toBe(false);
    expect(isEuCountry("Suisse")).toBe(false);
  });

  it("treats unknown / null provenance as non-EU", () => {
    expect(isEuCountry(null)).toBe(false);
    expect(isEuCountry("")).toBe(false);
    expect(isEuCountry("Mars")).toBe(false);
  });
});

describe("toEnglishCountry", () => {
  it("translates French country names to English", () => {
    expect(toEnglishCountry("Allemagne")).toBe("Germany");
    expect(toEnglishCountry("Espagne")).toBe("Spain");
    expect(toEnglishCountry("Pays-Bas")).toBe("Netherlands");
  });

  it("matches regardless of accents/case and maps both Czechia spellings", () => {
    expect(toEnglishCountry("grèce")).toBe("Greece");
    expect(toEnglishCountry("République tchèque")).toBe("Czechia");
    expect(toEnglishCountry("Tchéquie")).toBe("Czechia");
  });

  it("passes unknown names through and null along", () => {
    expect(toEnglishCountry("Mars")).toBe("Mars");
    expect(toEnglishCountry(null)).toBeNull();
  });
});

describe("isEuLocationText", () => {
  it("classifies a raw 'de <Pays>' line end-to-end", () => {
    expect(isEuLocationText("de Italie")).toBe(true);
    expect(isEuLocationText("de Japon")).toBe(false);
    expect(isEuLocationText("de États-Unis")).toBe(false);
    expect(isEuLocationText(null)).toBe(false);
  });
});
