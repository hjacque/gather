/**
 * eBay search-query builder (Stage 1 of card → sales matching). Pure, no I/O.
 *
 * Turns a Card's messy display name into a clean eBay completed-listings search
 * term of the shape:
 *
 *   <core-name> <number> psa <year>
 *   "Full Art/Cramorant Pokemon Stamp Box" #226 (2021) -> "cramorant 226 psa 2021"
 *
 * The query is deliberately broad on the name (the card-aware Listing Title
 * Parser filters results down by collector number); the collector `number`,
 * `psa` grade marker and release `year` are the precision anchors that cut
 * cross-era and non-graded noise out of the result set.
 *
 * Core-name reduction: Card names embed the specific promo/box/store the card
 * came from ("Pokemon Stamp Box", "Pokemon Center Yokohama Special Box", ...),
 * which is search noise. Those descriptors reliably trail the Pokémon species
 * name, so we keep everything up to and including the FIRST species mention and
 * drop the rest. Names with no species (trainer / trophy / item cards such as
 * "Victory Medal", "Pokemon Pal City") have no anchor and fall back to the full
 * cleaned name.
 */

import { POKEMON_SPECIES } from "./pokemonSpecies";

// Leading / inline grading-irrelevant descriptors. Order matters: the more
// specific "pokemon card" is stripped before the bare "pokemon".
const BOILERPLATE = [
  /\bfull art\b/g,
  /\bpokemon card\b/g,
  /\bpokemon\b/g,
  /\bholo\b/g,
];

// Broader set / box / store / promo vocabulary removed by the "strip-set"
// strategy. Deliberately fuzzy — it keeps the full name minus distribution
// noise, for cards where the first-species reduction drops too much.
const SET_WORDS =
  /\b(?:box|set|special|stamp|campaign|booster|pack|store|shop|prize|giveaway|festa|outbreak|event|trophy|opening|reopening|edition|promo|lenticular|retrospective|munch|anniversary|countdown|club|fan|pt|pts|kids|uniqlo|midsummer|shining|grand|plan|mystery|dungeon|family|plaza|knockout|challenge|winner|reviving|legends|daisuki)\b/g;

/** The three name-cleaning strategies the generator can apply per Card. */
export type QueryStrategy = "core" | "strip-set" | "full";

// Normalize a name to lowercase space-separated tokens: drop possessive "'s",
// glue any remaining apostrophes (so "Farfetch'd" -> "farfetchd" matches its
// species slug), and turn every other separator / punctuation into a space.
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/['’]s\b/g, "")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

// Strip grading-irrelevant boilerplate; keep every other token. This is the
// "full" strategy's cleaned name (set/box descriptors retained).
export function cleanFullName(name: string): string {
  let cleaned = normalizeName(name);
  for (const re of BOILERPLATE) cleaned = cleaned.replace(re, " ");
  return collapse(cleaned);
}

// "full" cleaning with the broader set/box/store vocabulary also removed.
export function stripSetWords(name: string): string {
  return collapse(cleanFullName(name).replace(SET_WORDS, " "));
}

const collapse = (s: string): string => s.replace(/\s+/g, " ").trim();

// Species lookup built once from the slug list, normalized the same way Card
// names are so hyphenated slugs ("ho-oh", "porygon-z", "tapu-koko") match their
// spaced mentions. `maxTokens` bounds the multi-word window we probe.
const SPECIES = new Set<string>();
let maxSpeciesTokens = 1;
for (const slug of POKEMON_SPECIES) {
  const normalized = normalizeName(slug);
  if (!normalized) continue;
  SPECIES.add(normalized);
  maxSpeciesTokens = Math.max(maxSpeciesTokens, normalized.split(" ").length);
}

/**
 * Reduce a Card name to its core search term: the cleaned name truncated at the
 * end of the first Pokémon species mention. Returns the full cleaned name when
 * the Card names no species.
 */
export function extractCoreName(name: string): string {
  const tokens = cleanFullName(name).split(" ").filter(Boolean);

  for (let i = 0; i < tokens.length; i++) {
    const window = Math.min(maxSpeciesTokens, tokens.length - i);
    // Prefer the longest match at this position so "tapu koko" wins over "tapu".
    for (let len = window; len >= 1; len--) {
      if (SPECIES.has(tokens.slice(i, i + len).join(" "))) {
        return tokens.slice(0, i + len).join(" ");
      }
    }
  }
  return tokens.join(" ");
}

/** Resolve the name part for a strategy. */
export function applyStrategy(name: string, strategy: QueryStrategy): string {
  switch (strategy) {
    case "core":
      return extractCoreName(name);
    case "strip-set":
      return stripSetWords(name);
    case "full":
      return cleanFullName(name);
  }
}

/**
 * Build the raw `_nkw` search term: `<name> <number> psa <year>`, where the name
 * part is produced by `strategy` (default `core`).
 */
export function buildEbayQuery(
  name: string,
  number: string | null,
  year: number | null,
  strategy: QueryStrategy = "core"
): string {
  return collapse(
    [applyStrategy(name, strategy), number ?? "", "psa", year ?? ""]
      .filter(Boolean)
      .join(" ")
  );
}

/**
 * Pull the raw `_nkw` search term back out of a finished eBay link. Returns null
 * for an absent or unparseable link. The link is the source of truth for the
 * curated per-Card query (it may have been hand-edited away from buildEbayQuery).
 */
export function queryFromLink(link: string | null): string | null {
  if (!link) return null;
  try {
    return new URL(link).searchParams.get("_nkw");
  } catch {
    return null;
  }
}

/** Wrap a finished `_nkw` search term in the eBay sold + completed search URL. */
export function buildEbayLinkFromQuery(query: string): string {
  const url = new URL("https://www.ebay.com/sch/i.html");
  url.searchParams.set("_from", "R40");
  url.searchParams.set("_nkw", query);
  url.searchParams.set("_sacat", "0");
  url.searchParams.set("_fcid", "1");
  url.searchParams.set("rt", "nc");
  url.searchParams.set("LH_Sold", "1");
  url.searchParams.set("LH_Complete", "1");
  return url.toString();
}

/** Build the full eBay search URL for a Card using `strategy` (default `core`). */
export function buildEbayLink(
  name: string,
  number: string | null,
  year: number | null,
  strategy: QueryStrategy = "core"
): string {
  return buildEbayLinkFromQuery(buildEbayQuery(name, number, year, strategy));
}
