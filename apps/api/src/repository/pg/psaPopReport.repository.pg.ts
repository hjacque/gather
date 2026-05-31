import { PrismaClient } from "@prisma/client";
import type { PsaGrades } from "../../application/sync/sources/psa.source";
import {
  PsaPopReportEntity,
  PsaPopReportRepositoryPort,
} from "../ports/psaPopReport.repository.port";

export class PsaPopReportRepositoryPg implements PsaPopReportRepositoryPort {
  constructor(private readonly prisma: PrismaClient) {}

  async upsert(
    cardId: string,
    grades: PsaGrades,
    syncedAt: Date
  ): Promise<void> {
    await this.prisma.psaPopReport.upsert({
      where: { cardId },
      create: {
        cardId,
        grade1: grades.grade1,
        grade2: grades.grade2,
        grade3: grades.grade3,
        grade4: grades.grade4,
        grade5: grades.grade5,
        grade6: grades.grade6,
        grade7: grades.grade7,
        grade8: grades.grade8,
        grade9: grades.grade9,
        grade10: grades.grade10,
        total: grades.total,
        syncedAt,
      },
      update: {
        grade1: grades.grade1,
        grade2: grades.grade2,
        grade3: grades.grade3,
        grade4: grades.grade4,
        grade5: grades.grade5,
        grade6: grades.grade6,
        grade7: grades.grade7,
        grade8: grades.grade8,
        grade9: grades.grade9,
        grade10: grades.grade10,
        total: grades.total,
        syncedAt,
      },
    });
  }

  async findByCardId(cardId: string): Promise<PsaPopReportEntity | null> {
    const record = await this.prisma.psaPopReport.findUnique({
      where: { cardId },
    });
    return record;
  }

  async findByCardIds(cardIds: string[]): Promise<Map<string, PsaPopReportEntity>> {
    const records = await this.prisma.psaPopReport.findMany({
      where: { cardId: { in: cardIds } },
    });
    const map = new Map<string, PsaPopReportEntity>();
    for (const record of records) {
      map.set(record.cardId, record);
    }
    return map;
  }
}
