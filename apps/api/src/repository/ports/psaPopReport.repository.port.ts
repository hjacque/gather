import type { PsaGrades } from "../../application/sync/sources/psa.source";

export type PsaPopReportEntity = {
  id: string;
  productId: string;
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
  syncedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export abstract class PsaPopReportRepositoryPort {
  abstract upsert(
    productId: string,
    grades: PsaGrades,
    syncedAt: Date
  ): Promise<void>;

  abstract findByProductId(
    productId: string
  ): Promise<PsaPopReportEntity | null>;

  abstract findByProductIds(
    productIds: string[]
  ): Promise<Map<string, PsaPopReportEntity>>;
}
