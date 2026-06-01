import { SaleRepositoryPort } from "../ports/sale.repository.port";
import { SaleMapper } from "./mappers/sale.mapper.pg";
import { NewSale } from "../../entities/sale.entity";
import { PrismaClient } from "@prisma/client";

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
}
