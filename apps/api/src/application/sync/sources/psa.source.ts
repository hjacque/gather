import type { Page } from "rebrowser-puppeteer-core";

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

// Column indices (0-based, including hidden control col):
// 0=control(hidden), 1=CardNo, 2=Name, 3=GradeLabel, 4=Auth,
// 5=grade1, 6=grade1.5(skip), 7=grade2, 8=grade3, 9=grade4, 10=grade5,
// 11=grade6, 12=grade7, 13=grade8, 14=grade9, 15=grade10, 16=Total
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

function parseGradeText(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed === "–" || trimmed === "-" || trimmed === "") return null;
  const num = parseInt(trimmed.replace(/,/g, ""), 10);
  return isNaN(num) ? null : num;
}

export function parsePsaPopReportHtml(html: string): PsaGrades {
  const grades = { ...NULL_GRADES };

  const tbodyMatch = html.match(
    /<table[^>]*id=["']tablePSA["'][^>]*>[\s\S]*?<tbody[^>]*>([\s\S]*?)<\/tbody>/i
  );
  if (!tbodyMatch) return grades;

  const firstRowMatch = tbodyMatch[1].match(/<tr[^>]*>([\s\S]*?)<\/tr>/i);
  if (!firstRowMatch) return grades;

  const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
  const cells: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = tdRegex.exec(firstRowMatch[1])) !== null) {
    cells.push(m[1]);
  }

  for (const [colIdx, key] of GRADE_COLUMNS) {
    const cell = cells[colIdx];
    if (cell == null) continue;
    const firstDivMatch = cell.match(/<div[^>]*>(.*?)<\/div>/i);
    if (!firstDivMatch) continue;
    const text = firstDivMatch[1].replace(/<[^>]+>/g, "");
    grades[key] = parseGradeText(text);
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

    // Wait for search form and initial table rows to be present
    await page.waitForSelector("[data-search-input]", { timeout: 15000 });
    await page.waitForSelector("#tablePSA tbody tr", { timeout: 15000 });

    const searchInput = productNumber ? `${productName} ${productNumber}` : productName;
    await page.type("[data-search-input]", searchInput);
    await page.click("[data-search-btn]");

    // DataTables filters client-side; give it a moment to apply
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
