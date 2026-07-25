const EU_COUNTRIES_FR = [
  "Allemagne",
  "Autriche",
  "Belgique",
  "Bulgarie",
  "Chypre",
  "Croatie",
  "Danemark",
  "Espagne",
  "Estonie",
  "Finlande",
  "France",
  "Grèce",
  "Hongrie",
  "Irlande",
  "Italie",
  "Lettonie",
  "Lituanie",
  "Luxembourg",
  "Malte",
  "Pays-Bas",
  "Pologne",
  "Portugal",
  "République tchèque",
  "Tchéquie",
  "Roumanie",
  "Slovaquie",
  "Slovénie",
  "Suède",
];

const normalize = (s: string): string =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const EU_NORMALIZED = new Set(EU_COUNTRIES_FR.map(normalize));

const EN_BY_NORMALIZED_FR: Record<string, string> = {
  allemagne: "Germany",
  autriche: "Austria",
  belgique: "Belgium",
  bulgarie: "Bulgaria",
  chypre: "Cyprus",
  croatie: "Croatia",
  danemark: "Denmark",
  espagne: "Spain",
  estonie: "Estonia",
  finlande: "Finland",
  france: "France",
  grece: "Greece",
  hongrie: "Hungary",
  irlande: "Ireland",
  italie: "Italy",
  lettonie: "Latvia",
  lituanie: "Lithuania",
  luxembourg: "Luxembourg",
  malte: "Malta",
  "pays-bas": "Netherlands",
  pologne: "Poland",
  portugal: "Portugal",
  "republique tcheque": "Czechia",
  tchequie: "Czechia",
  roumanie: "Romania",
  slovaquie: "Slovakia",
  slovenie: "Slovenia",
  suede: "Sweden",
};

export function toEnglishCountry(country: string | null): string | null {
  if (!country) return null;
  return EN_BY_NORMALIZED_FR[normalize(country)] ?? country;
}

export function parseListingLocation(
  locationText: string | null,
): string | null {
  if (!locationText) return null;
  const country = locationText
    .trim()
    .replace(/^d(?:[eu]s?\b|['’])\s*/i, "")
    .trim();
  return country || null;
}

export function isEuCountry(country: string | null): boolean {
  if (!country) return false;
  return EU_NORMALIZED.has(normalize(country));
}

export function isEuLocationText(locationText: string | null): boolean {
  return isEuCountry(parseListingLocation(locationText));
}
