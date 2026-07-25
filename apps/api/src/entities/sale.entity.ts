export { SaleEntity } from "@gather/types";

import { Platform, SaleSource, SaleStatus, VerificationStage } from "@gather/types";

export type SaleVerification = {
  status: SaleStatus;
  verificationStage: VerificationStage;
};

export type NewSale = {
  cardId: string;
  platform: Platform;
  itemId: string;
  psaGrade: number;
  price: number;
  currency: string;
  title: string;
  isBestOffer: boolean;
  seller: string | null;
  source: SaleSource;
  reviewedAt: Date | null;
  status?: SaleStatus;
  verificationStage?: VerificationStage;
  soldAt: Date;
};
