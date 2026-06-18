/**
 * EU item-location classification (pure). eBay's `LH_PrefLoc=3` ("Provenance =
 * Union européenne") renders as applied but does NOT actually restrict the
 * result set — a live capture of an EU-filtered search returned 38 Japan, 13
 * US and 3 UK rows alongside the genuine EU ones. So provenance can't be left
 * to the search URL; it must be read off each result row and enforced here.
 *
 * eBay.fr prints the item location on a result row as a "de <Pays>" attribute
 * line (e.g. "de Allemagne", "de Japon", "de États-Unis"). This module strips
 * that to a country name and decides EU membership against the 27 current
 * member states, matched accent- and case-insensitively.
 */

// The 27 EU member states, in the French spelling eBay.fr renders. The UK is
// deliberately absent (post-Brexit), as are Switzerland, Norway, etc.
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

// Lowercased, accent-stripped for tolerant matching ("Grèce" -> "grece").
const normalize = (s: string): string =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const EU_NORMALIZED = new Set(EU_COUNTRIES_FR.map(normalize));

// French → English country names for display: locations are parsed off eBay.fr
// in French, but the app is English-only. Keyed by the normalized French name
// so the lookup is accent- and case-insensitive. Both French spellings of
// Czechia map to the single English name.
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

// Translate a (French) country name to English for display. Falls back to the
// input unchanged when unrecognised, and passes null through.
export function toEnglishCountry(country: string | null): string | null {
  if (!country) return null;
  return EN_BY_NORMALIZED_FR[normalize(country)] ?? country;
}

/**
 * Pull the country out of a result row's location line. Accepts the raw
 * "de <Pays>" attribute text (the article "de"/"du"/"des"/"d'" is dropped), or
 * a bare country name. Returns null for empty/unparseable input.
 */
export function parseListingLocation(
  locationText: string | null,
): string | null {
  if (!locationText) return null;
  // Strip a leading article ("de"/"du"/"des"/"d'") plus any following spaces;
  // a bare article ("de ") collapses to empty and yields null.
  const country = locationText
    .trim()
    .replace(/^d(?:[eu]s?\b|['’])\s*/i, "")
    .trim();
  return country || null;
}

// True only for a confirmed EU member state. Unknown / null locations are NOT
// EU: an ask whose provenance we can't verify must not feed the EU buy side.
export function isEuCountry(country: string | null): boolean {
  if (!country) return false;
  return EU_NORMALIZED.has(normalize(country));
}

// Convenience: classify a raw "de <Pays>" line in one step.
export function isEuLocationText(locationText: string | null): boolean {
  return isEuCountry(parseListingLocation(locationText));
}
