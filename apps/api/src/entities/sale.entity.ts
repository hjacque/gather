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
  // eBay store slug of the seller, or null for non-store listings.
  seller: string | null;
  reviewedAt: Date | null;
  status?: SaleStatus;
  verificationStage?: VerificationStage;
  soldAt: Date;
};
