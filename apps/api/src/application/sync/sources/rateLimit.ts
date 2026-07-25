export class RateLimitError extends Error {
  constructor(
    readonly source: string,
    where = ""
  ) {
    super(`${source} rate limited${where ? ` at ${where}` : ""}`);
    this.name = "RateLimitError";
  }
}

export function isRateLimitedBody(body: string): boolean {
  return (
    body.includes("Pardon Our Interruption") ||
    body.includes("rate limited") ||
    body.includes("You are being rate limited")
  );
}
