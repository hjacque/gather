export type SkipReason = "no-grade" | "multi-grade" | "bundle" | "foreign-card";

export type ParsedTitle =
  | { kind: "accepted"; grade: number }
  | { kind: "skipped"; reason: SkipReason };

export type TargetCard = {
  number: string | null;
};

const BUNDLE_KEYWORD = /\b(?:set|sequential|seq|lot|bundle|pair|both|sealed|complete)\b/i;

const PSA_GRADE = /psa\s*(\d+)/gi;

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
