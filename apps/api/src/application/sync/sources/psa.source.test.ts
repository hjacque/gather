import * as fs from "fs";
import * as path from "path";
import { parsePsaPopReportHtml } from "./psa.source";

const fixturePath = path.join(
  __dirname,
  "__fixtures__",
  "psa-pop-report.html"
);

describe("parsePsaPopReportHtml", () => {
  let html: string;

  beforeAll(() => {
    html = fs.readFileSync(fixturePath, "utf-8");
  });

  it("parses grade counts from the PSA pop report fixture", () => {
    const result = parsePsaPopReportHtml(html);

    expect(result.grade1).toBe(2);
    expect(result.grade2).toBe(0);
    expect(result.grade3).toBe(1);
    expect(result.grade4).toBe(5);
    expect(result.grade5).toBe(10);
    expect(result.grade6).toBe(15);
    expect(result.grade7).toBe(30);
    expect(result.grade8).toBe(78);
    expect(result.grade9).toBe(142);
    expect(result.grade10).toBe(256);
  });

  it("returns all-null grades for empty HTML", () => {
    const result = parsePsaPopReportHtml("<html><body></body></html>");

    expect(result.grade1).toBeNull();
    expect(result.grade2).toBeNull();
    expect(result.grade3).toBeNull();
    expect(result.grade4).toBeNull();
    expect(result.grade5).toBeNull();
    expect(result.grade6).toBeNull();
    expect(result.grade7).toBeNull();
    expect(result.grade8).toBeNull();
    expect(result.grade9).toBeNull();
    expect(result.grade10).toBeNull();
  });

  it("returns all-null grades for malformed HTML", () => {
    const result = parsePsaPopReportHtml("not html at all $$%%^^");

    expect(result.grade1).toBeNull();
    expect(result.grade10).toBeNull();
  });
});
