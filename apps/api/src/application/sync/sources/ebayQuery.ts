import { POKEMON_SPECIES } from "./pokemonSpecies";

const BOILERPLATE = [
  /\bfull art\b/g,
  /\bpokemon card\b/g,
  /\bpokemon\b/g,
  /\bholo\b/g,
];

const SET_WORDS =
  /\b(?:box|set|special|stamp|campaign|booster|pack|store|shop|prize|giveaway|festa|outbreak|event|trophy|opening|reopening|edition|promo|lenticular|retrospective|munch|anniversary|countdown|club|fan|pt|pts|kids|uniqlo|midsummer|shining|grand|plan|mystery|dungeon|family|plaza|knockout|challenge|winner|reviving|legends|daisuki)\b/g;

export type QueryStrategy = "core" | "strip-set" | "full";

export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/['’]s\b/g, "")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function cleanFullName(name: string): string {
  let cleaned = normalizeName(name);
  for (const re of BOILERPLATE) cleaned = cleaned.replace(re, " ");
  return collapse(cleaned);
}

export function stripSetWords(name: string): string {
  return collapse(cleanFullName(name).replace(SET_WORDS, " "));
}

const collapse = (s: string): string => s.replace(/\s+/g, " ").trim();

const SPECIES = new Set<string>();
let maxSpeciesTokens = 1;
for (const slug of POKEMON_SPECIES) {
  const normalized = normalizeName(slug);
  if (!normalized) continue;
  SPECIES.add(normalized);
  maxSpeciesTokens = Math.max(maxSpeciesTokens, normalized.split(" ").length);
}

export function extractCoreName(name: string): string {
  const tokens = cleanFullName(name).split(" ").filter(Boolean);

  for (let i = 0; i < tokens.length; i++) {
    const window = Math.min(maxSpeciesTokens, tokens.length - i);
    for (let len = window; len >= 1; len--) {
      if (SPECIES.has(tokens.slice(i, i + len).join(" "))) {
        return tokens.slice(0, i + len).join(" ");
      }
    }
  }
  return tokens.join(" ");
}

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

export function queryFromLink(link: string | null): string | null {
  if (!link) return null;
  try {
    return new URL(link).searchParams.get("_nkw");
  } catch {
    return null;
  }
}

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

export function buildEbayLink(
  name: string,
  number: string | null,
  year: number | null,
  strategy: QueryStrategy = "core"
): string {
  return buildEbayLinkFromQuery(buildEbayQuery(name, number, year, strategy));
}
