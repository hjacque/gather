/**
 * Listing Title Parser (gather-gj4.2) — pure, card-aware classification of a
 * single eBay completed-listing title.
 *
 * Given a raw listing title and the target Card's identity, it either extracts
 * the single PSA grade the listing is for, or rejects the title with a reason.
 * No I/O. Mirrors the fixture-tested `parsePsaPopReportHtml` extraction.
 *
 * It is *card-aware* on purpose: a single eBay search (e.g. "cramorant 226 psa")
 * returns the target single card mixed with multi-card "sequential set" listings
 * (e.g. Pikachu 227 + Cramorant 226 sold together) that name a *foreign* card
 * number with no bundle keyword. A title-only parser cannot tell those apart, so
 * the target Card's number is passed in and any foreign card number is rejected.
 */

export type SkipReason = "no-grade" | "multi-grade" | "bundle" | "foreign-card";

export type ParsedTitle =
  | { kind: "accepted"; grade: number }
  | { kind: "skipped"; reason: SkipReason };

export type TargetCard = {
  /** The Card's collector number, e.g. "226". Null when the Card has none. */
  number: string | null;
};

// Lots / bundles / multi-card sets: a price here spans more than one card.
const BUNDLE_KEYWORD = /\b(?:set|sequential|seq|lot|bundle|pair|both|sealed|complete)\b/i;

// A PSA grade mention, e.g. "PSA 10", "PSA10", "psa  9".
const PSA_GRADE = /psa\s*(\d+)/gi;

// A card-number token: 2–3 digits, optionally prefixed with "#", not glued to a
// letter or another digit (so it skips SKU codes like "Q3", grades, and years).
const CARD_NUMBER = /(?<![A-Za-z0-9])#?(\d{2,3})(?!\d)/g;

function extractGrades(title: string): number[] {
  const grades: number[] = [];
  for (const m of title.matchAll(PSA_GRADE)) {
    const n = parseInt(m[1], 10);
    if (n >= 1 && n <= 10) grades.push(n);
  }
  return grades;
}

function extractCardNumbers(title: string): Set<string> {
  // Strip tokens that look like card numbers but are not: PSA/AUTO grades and
  // 4+ digit runs (release years, long seller SKUs).
  const cleaned = title
    .replace(/psa\s*\d+/gi, " ")
    .replace(/auto\s*\d+/gi, " ")
    .replace(/\b\d{4,}\b/g, " ");
  const numbers = new Set<string>();
  for (const m of cleaned.matchAll(CARD_NUMBER)) numbers.add(m[1]);
  return numbers;
}

export function parseListingTitle(
  title: string,
  target: TargetCard
): ParsedTitle {
  const grades = extractGrades(title);

  if (grades.length === 0) return { kind: "skipped", reason: "no-grade" };
  if (new Set(grades).size > 1)
    return { kind: "skipped", reason: "multi-grade" };

  if (BUNDLE_KEYWORD.test(title) || title.includes("&"))
    return { kind: "skipped", reason: "bundle" };

  const targetNumber = target.number?.match(/\d{2,3}/)?.[0] ?? null;
  if (targetNumber) {
    const numbers = extractCardNumbers(title);
    for (const n of numbers) {
      if (n !== targetNumber) return { kind: "skipped", reason: "foreign-card" };
    }
  }

  return { kind: "accepted", grade: grades[0] };
}
