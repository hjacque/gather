export { SaleEntity } from "@gather/types";

import { Platform, SaleStatus, VerificationStage } from "@gather/types";

// Outcome of a re-verification checkpoint applied to a Sale.
export type SaleVerification = {
  status: SaleStatus;
  verificationStage: VerificationStage;
};

// Shape required to upsert a Sale scraped from a marketplace. Status and
// verification stage default to their initial values in the repository.
export type NewSale = {
  cardId: string;
  platform: Platform;
  itemId: string;
  psaGrade: number;
  price: number;
  currency: string;
  title: string;
  isBestOffer: boolean;
  // eBay store slug of the seller, or null for non-store listings.
  seller: string | null;
  // Trusted-seller auto-validation: when the seller is trusted the Sale is
  // persisted already reviewed (reviewedAt) and confirmed (status +
  // verificationStage), bypassing both the manual queue and re-verification.
  // For untrusted sellers reviewedAt is null and status/verificationStage are
  // omitted so the repository applies its pending/unverified defaults.
  reviewedAt: Date | null;
  status?: SaleStatus;
  verificationStage?: VerificationStage;
  soldAt: Date;
};
