import { SaleStatus, VerificationStage } from "@gather/types";

export type ItemPageState =
  | "sold"
  | "active"
  | "not-found";

export type Checkpoint = "7d" | "30d";

export type ReverificationOutcome = {
  status: SaleStatus;
  verificationStage: VerificationStage;
};

export function classifyReverification(
  state: ItemPageState,
  checkpoint: Checkpoint
): ReverificationOutcome {
  if (state !== "sold") {
    return { status: "invalid", verificationStage: "complete" };
  }

  if (checkpoint === "7d") {
    return { status: "pending", verificationStage: "checked_7d" };
  }

  return { status: "confirmed", verificationStage: "complete" };
}
