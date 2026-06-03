export const DEFAULT_USD_TO_EUR = 0.86;
export const EBAY_FEE = 0.1;
export const CARDMARKET_FEE = 0.05;

// eBay store slugs whose Sales are trusted and auto-validated (reviewed) at scrape
// time, so they never enter the manual Sale Review queue. Lowercased; matched
// against the store slug parsed from each listing's seller link
// (e.g. https://www.ebay.com/str/psa -> "psa").
export const TRUSTED_EBAY_SELLERS = ["psa"];
