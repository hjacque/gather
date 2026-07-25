import type { Page } from "rebrowser-puppeteer-core";
import { mkdirSync } from "fs";

export function psaProfileDir(): string {
  const dir =
    process.env.PSA_PROFILE_DIR ??
    `${process.env.HOME ?? "."}/.gather/psa-profile`;
  mkdirSync(dir, { recursive: true });
  return dir;
}

export function isPsaSignInUrl(url: string): boolean {
  return /\/(login|signin|sign-in)\b/i.test(url) || /login\.psacard\./i.test(url);
}

export type PsaGrades = {
  grade1: number | null;
  grade2: number | null;
  grade3: number | null;
  grade4: number | null;
  grade5: number | null;
  grade6: number | null;
  grade7: number | null;
  grade8: number | null;
  grade9: number | null;
  grade10: number | null;
  total: number | null;
};

const NULL_GRADES: PsaGrades = {
  grade1: null,
  grade2: null,
  grade3: null,
  grade4: null,
  grade5: null,
  grade6: null,
  grade7: null,
  grade8: null,
  grade9: null,
  grade10: null,
  total: null,
};

const GRADE_COLUMNS: [number, keyof PsaGrades][] = [
  [5, "grade1"],
  [7, "grade2"],
  [8, "grade3"],
  [9, "grade4"],
  [10, "grade5"],
  [11, "grade6"],
  [12, "grade7"],
  [13, "grade8"],
  [14, "grade9"],
  [15, "grade10"],
  [16, "total"],
];

function parseGradeCell(cell: string | undefined): number | null {
  if (!cell) return null;
  const text = cell.match(/<div[^>]*>([^<]*)</i)?.[1]?.trim() ?? "";
  if (text === "" || text === "–" || text === "-") return null;
  const num = parseInt(text.replace(/,/g, ""), 10);
  return Number.isNaN(num) ? null : num;
}

export function parsePsaPopReportHtml(html: string): PsaGrades {
  const tbody = html.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i)?.[1];
  if (!tbody) return { ...NULL_GRADES };

  const firstRow = tbody.match(/<tr[\s\S]*?<\/tr>/i)?.[0];
  if (!firstRow) return { ...NULL_GRADES };

  const cells = firstRow.match(/<td[\s\S]*?<\/td>/gi) ?? [];

  const grades: PsaGrades = { ...NULL_GRADES };
  for (const [colIdx, key] of GRADE_COLUMNS) {
    grades[key] = parseGradeCell(cells[colIdx]);
  }
  return grades;
}

export async function scrapePsaPopReport(
  psaLink: string,
  productName: string,
  productNumber: string | null,
  page: Page
): Promise<PsaGrades> {
  try {
    await page.goto(psaLink, { waitUntil: "domcontentloaded", timeout: 30000 });

    if (isPsaSignInUrl(page.url())) {
      console.error(
        `[PSA] Not signed in (redirected to ${page.url()}). Refresh the ` +
          "session by running: cd apps/api && npx ts-node src/scripts/psaLogin.ts"
      );
      return { ...NULL_GRADES };
    }

    await page.waitForSelector("[data-search-input]", { timeout: 15000 });
    await page.waitForSelector("#tablePSA tbody tr", { timeout: 15000 });

    const searchInput = productNumber ? `${productName} ${productNumber}` : productName;
    await page.type("[data-search-input]", searchInput);
    await page.click("[data-search-btn]");

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const grades = await page.evaluate(
      (gradeColumns: [number, string][]) => {
        const table = document.getElementById("tablePSA");
        if (!table) return null;

        const firstRow = table.querySelector("tbody tr");
        if (!firstRow) return null;

        const tds = firstRow.querySelectorAll("td");
        const result: Record<string, number | null> = {};

        for (const [colIdx, key] of gradeColumns) {
          const td = tds[colIdx];
          if (!td) {
            result[key] = null;
            continue;
          }
          const firstDiv = td.querySelector("div");
          const text = firstDiv?.textContent?.trim() ?? "";
          if (text === "–" || text === "-" || text === "") {
            result[key] = null;
          } else {
            const num = parseInt(text.replace(/,/g, ""), 10);
            result[key] = isNaN(num) ? null : num;
          }
        }

        return result;
      },
      GRADE_COLUMNS as [number, string][]
    );

    if (!grades) return { ...NULL_GRADES };

    return {
      grade1: grades.grade1 ?? null,
      grade2: grades.grade2 ?? null,
      grade3: grades.grade3 ?? null,
      grade4: grades.grade4 ?? null,
      grade5: grades.grade5 ?? null,
      grade6: grades.grade6 ?? null,
      grade7: grades.grade7 ?? null,
      grade8: grades.grade8 ?? null,
      grade9: grades.grade9 ?? null,
      grade10: grades.grade10 ?? null,
      total: grades.total ?? null,
    };
  } catch (error) {
    console.error(`[PSA] Failed to scrape pop report for ${psaLink}:`, error);
    return { ...NULL_GRADES };
  }
}
