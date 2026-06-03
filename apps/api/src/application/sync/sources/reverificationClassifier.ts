import { SaleStatus, VerificationStage } from "@gather/types";

/**
 * Re-verification Classifier (gather-gj4.3) — pure lifecycle decision for a
 * Sale revisited at a checkpoint. No I/O: the Puppeteer source reduces the
 * revisited item page to an `ItemPageState`, this maps (state, checkpoint) to
 * the Sale's new status + verification stage.
 *
 * The only state that keeps a Sale alive is a still-visible *sold* page. A page
 * that is gone (404 / removed) or back to a live/relisted listing means the
 * recorded sale did not stick → invalid. So detection only has to recognise
 * the positive "sold" signal; everything else collapses to invalid.
 *
 * Lifecycle: a sold Sale at the 7-day check only advances to `checked_7d`
 * (never confirms — the 7-day check exists to catch early cancellations); it is
 * confirmed only after surviving to the 30-day check. Both checks are terminal
 * on a non-sold page.
 */

// What the revisited item page resolved to.
export type ItemPageState =
  | "sold" // ended-sold page still showing the sale
  | "active" // reachable but live/relisted — no sold signal
  | "not-found"; // 404 / listing removed

// Which checkpoint triggered this re-verification.
export type Checkpoint = "7d" | "30d";

export type ReverificationOutcome = {
  status: SaleStatus;
  verificationStage: VerificationStage;
};

export function classifyReverification(
  state: ItemPageState,
  checkpoint: Checkpoint
): ReverificationOutcome {
  // Sale didn't stick: gone, or relisted/active again.
  if (state !== "sold") {
    return { status: "invalid", verificationStage: "complete" };
  }

  // Still sold at 7 days — survived early-cancellation window, but not yet
  // trustworthy; advance the stage and keep it pending.
  if (checkpoint === "7d") {
    return { status: "pending", verificationStage: "checked_7d" };
  }

  // Still sold at 30 days — survived the full eBay cancellation window.
  return { status: "confirmed", verificationStage: "complete" };
}
