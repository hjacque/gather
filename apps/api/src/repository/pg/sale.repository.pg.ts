import {
  SaleRepositoryPort,
  UnreviewedSalesCard,
} from "../ports/sale.repository.port";
import { SaleMapper } from "./mappers/sale.mapper.pg";
import { NewSale, SaleVerification } from "../../entities/sale.entity";
import { Prisma, PrismaClient } from "@prisma/client";

const DAY_MS = 24 * 60 * 60 * 1000;

export class SaleRepositoryPg implements SaleRepositoryPort {
  private saleMapper: SaleMapper;

  constructor(private readonly prisma: PrismaClient) {
    this.saleMapper = new SaleMapper();
  }

  async upsert(sale: NewSale): Promise<boolean> {
    const { platform, itemId, cardId } = sale;
    const existing = await this.prisma.sale.findUnique({
      where: { platform_itemId_cardId: { platform, itemId, cardId } },
      select: { id: true, reviewedAt: true, source: true },
    });

    const trustedFields = sale.reviewedAt
      ? {
          reviewedAt: sale.reviewedAt,
          ...(sale.status ? { status: sale.status } : {}),
          ...(sale.verificationStage
            ? { verificationStage: sale.verificationStage }
            : {}),
        }
      : {};

    if (!existing) {
      await this.prisma.sale.create({
        data: {
          cardId: sale.cardId,
          platform: sale.platform,
          itemId: sale.itemId,
          psaGrade: sale.psaGrade,
          price: sale.price,
          currency: sale.currency,
          title: sale.title,
          isBestOffer: sale.isBestOffer,
          seller: sale.seller,
          source: sale.source,
          soldAt: sale.soldAt,
          ...trustedFields,
        },
      });
      return true;
    }

    if (sale.source === "ebay_search" && existing.source === "terapeak") {
      return false;
    }

    const terapeakUpgrade =
      sale.source === "terapeak" && existing.source === "ebay_search";

    if (existing.reviewedAt && !terapeakUpgrade) return false;

    const reviewedEdits = existing.reviewedAt
      ? {}
      : { psaGrade: sale.psaGrade, price: sale.price };

    await this.prisma.sale.update({
      where: { id: existing.id },
      data: {
        ...reviewedEdits,
        currency: sale.currency,
        title: sale.title,
        isBestOffer: sale.isBestOffer,
        seller: sale.seller,
        source: sale.source,
        soldAt: sale.soldAt,
        ...trustedFields,
      },
    });
    return false;
  }

  async getSaleById(saleId: string) {
    const sale = await this.prisma.sale.findUniqueOrThrow({
      where: { id: saleId },
    });
    return this.saleMapper.toEntity(sale);
  }

  async getCardSales(cardId: string) {
    const sales = await this.prisma.sale.findMany({
      where: { cardId },
      orderBy: { soldAt: "asc" },
    });

    return sales.map((s) => this.saleMapper.toEntity(s));
  }

  async getCardsSales(cardIds: string[]) {
    const byCard = new Map<string, ReturnType<SaleMapper["toEntity"]>[]>();
    if (cardIds.length === 0) return byCard;

    const sales = await this.prisma.sale.findMany({
      where: { cardId: { in: cardIds } },
      orderBy: { soldAt: "asc" },
    });

    for (const s of sales) {
      const entity = this.saleMapper.toEntity(s);
      const list = byCard.get(s.cardId);
      if (list) list.push(entity);
      else byCard.set(s.cardId, [entity]);
    }

    return byCard;
  }

  async getSalesDueForVerification(now: Date, cardId?: string) {
    const sevenDaysAgo = new Date(now.getTime() - 7 * DAY_MS);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * DAY_MS);

    const sales = await this.prisma.sale.findMany({
      where: {
        status: "pending",
        reviewedAt: null,
        ...(cardId ? { cardId } : {}),
        OR: [
          { verificationStage: "unverified", soldAt: { lte: sevenDaysAgo } },
          { verificationStage: "checked_7d", soldAt: { lte: thirtyDaysAgo } },
        ],
      },
      orderBy: { soldAt: "asc" },
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

  async markInvalid(saleId: string) {
    await this.prisma.sale.update({
      where: { id: saleId },
      data: {
        status: "invalid",
        verificationStage: "complete",
        reviewedAt: new Date(),
      },
    });
  }

  async getUnreviewedSalesByCard(
    page: number,
    pageSize: number
  ): Promise<{ cards: UnreviewedSalesCard[]; totalCards: number }> {
    const filter = Prisma.sql`"reviewedAt" IS NULL AND "status" = 'pending'`;

    const [pageRows, totalRows] = await Promise.all([
      this.prisma.$queryRaw<{ cardId: string }[]>`
        SELECT "cardId"
        FROM "Sale"
        WHERE ${filter}
        GROUP BY "cardId"
        ORDER BY MIN("soldAt") ASC
        LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}
      `,
      this.prisma.$queryRaw<{ count: number }[]>`
        SELECT COUNT(DISTINCT "cardId")::int AS count
        FROM "Sale"
        WHERE ${filter}
      `,
    ]);

    const totalCards = Number(totalRows[0]?.count ?? 0);
    const cardIds = pageRows.map((r) => r.cardId);
    if (cardIds.length === 0) return { cards: [], totalCards };

    const [cards, sales] = await Promise.all([
      this.prisma.card.findMany({
        where: { id: { in: cardIds } },
        include: { cardSet: true },
      }),
      this.prisma.sale.findMany({
        where: {
          cardId: { in: cardIds },
          reviewedAt: null,
          status: "pending",
        },
        orderBy: { soldAt: "asc" },
      }),
    ]);

    const salesByCard = new Map<string, ReturnType<SaleMapper["toEntity"]>[]>();
    for (const s of sales) {
      const entity = this.saleMapper.toEntity(s);
      const list = salesByCard.get(s.cardId);
      if (list) list.push(entity);
      else salesByCard.set(s.cardId, [entity]);
    }

    const cardById = new Map(cards.map((c) => [c.id, c]));

    const result: UnreviewedSalesCard[] = cardIds.flatMap((id) => {
      const c = cardById.get(id);
      if (!c) return [];
      return [
        {
          card: {
            id: c.id,
            name: c.name,
            number: c.number,
            imageUrl: c.imageUrl,
            setName: c.cardSet.name,
          },
          sales: salesByCard.get(id) ?? [],
        },
      ];
    });

    return { cards: result, totalCards };
  }

  async getUnreviewedCount(): Promise<number> {
    return this.prisma.sale.count({
      where: {
        reviewedAt: null,
        status: "pending",
      },
    });
  }

  async markReviewed(
    saleId: string,
    edits: { psaGrade?: number; price?: number }
  ) {
    await this.prisma.sale.update({
      where: { id: saleId },
      data: {
        reviewedAt: new Date(),
        ...(edits.psaGrade !== undefined ? { psaGrade: edits.psaGrade } : {}),
        ...(edits.price !== undefined ? { price: edits.price } : {}),
      },
    });
  }
}
