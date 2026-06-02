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
  soldAt: Date;
};
