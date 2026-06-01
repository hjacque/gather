import { SaleRepositoryPort } from "../ports/sale.repository.port";
import { SaleMapper } from "./mappers/sale.mapper.pg";
import { NewSale, SaleVerification } from "../../entities/sale.entity";
import { PrismaClient } from "@prisma/client";

const DAY_MS = 24 * 60 * 60 * 1000;

export class SaleRepositoryPg implements SaleRepositoryPort {
  private saleMapper: SaleMapper;

  constructor(private readonly prisma: PrismaClient) {
    this.saleMapper = new SaleMapper();
  }

  async upsert(sale: NewSale): Promise<void> {
    const { platform, itemId } = sale;
    await this.prisma.sale.upsert({
      where: { platform_itemId: { platform, itemId } },
      create: {
        cardId: sale.cardId,
        platform: sale.platform,
        itemId: sale.itemId,
        psaGrade: sale.psaGrade,
        price: sale.price,
        currency: sale.currency,
        title: sale.title,
        isBestOffer: sale.isBestOffer,
        soldAt: sale.soldAt,
      },
      update: {
        cardId: sale.cardId,
        psaGrade: sale.psaGrade,
        price: sale.price,
        currency: sale.currency,
        title: sale.title,
        isBestOffer: sale.isBestOffer,
        soldAt: sale.soldAt,
      },
    });
  }

  async getCardSales(cardId: string) {
    const sales = await this.prisma.sale.findMany({
      where: { cardId },
      orderBy: { soldAt: "asc" },
    });

    return sales.map((s) => this.saleMapper.toEntity(s));
  }

  async getSalesDueForVerification(now: Date, cardId?: string) {
    const sevenDaysAgo = new Date(now.getTime() - 7 * DAY_MS);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * DAY_MS);

    const sales = await this.prisma.sale.findMany({
      where: {
        status: "pending",
        ...(cardId ? { cardId } : {}),
        OR: [
          { verificationStage: "unverified", createdAt: { lte: sevenDaysAgo } },
          { verificationStage: "checked_7d", createdAt: { lte: thirtyDaysAgo } },
        ],
      },
      orderBy: { createdAt: "asc" },
    });

    return sales.map((s) => this.saleMapper.toEntity(s));
  }

  async updateVerification(saleId: string, verification: SaleVerification) {
    await this.prisma.sale.update({
      where: { id: saleId },
      data: {
        status: verification.status,
        verificationStage: verification.verificationStage,
      },
    });
  }
}
