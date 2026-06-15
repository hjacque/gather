export { SaleEntity } from "@gather/types";

import { Platform, SaleSource, SaleStatus, VerificationStage } from "@gather/types";

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
  // True for a Best-Offer listing (scraped price is the ask, not the realized
  // price). Only the eBay-search source sets this; Terapeak rows are false.
  isBestOffer: boolean;
  // eBay store slug of the seller, or null for non-store listings.
  seller: string | null;
  // Which scraper supplied this price. The repository uses it to keep a
  // real-time ebay_search price from overwriting an authoritative terapeak one.
  source: SaleSource;
  reviewedAt: Date | null;
  status?: SaleStatus;
  verificationStage?: VerificationStage;
  soldAt: Date;
};
