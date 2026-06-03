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

  async upsert(sale: NewSale): Promise<void> {
    const { platform, itemId } = sale;
    const existing = await this.prisma.sale.findUnique({
      where: { platform_itemId: { platform, itemId } },
      select: { id: true, reviewedAt: true },
    });

    // Trusted-seller auto-validation: persist already reviewed + confirmed so
    // the Sale skips both the manual queue and re-verification.
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
          soldAt: sale.soldAt,
          ...trustedFields,
        },
      });
      return;
    }

    // Reviewed Sales are frozen against re-scrape: their scraped fields are
    // settled history, and the daily Sale Sync must not clobber an admin's grade
    // correction or entered Best-Offer price. Re-verification still runs (it
    // updates status/verificationStage, not scraped fields). See Sale Review.
    if (existing.reviewedAt) return;

    await this.prisma.sale.update({
      where: { id: existing.id },
      data: {
        cardId: sale.cardId,
        psaGrade: sale.psaGrade,
        price: sale.price,
        currency: sale.currency,
        title: sale.title,
        isBestOffer: sale.isBestOffer,
        seller: sale.seller,
        soldAt: sale.soldAt,
        // Only trusted sellers override status/verificationStage here; for
        // everyone else those stay owned by the re-verification pass.
        ...trustedFields,
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

  async markInvalid(saleId: string) {
    // `invalid` is a human decision, so it counts as reviewed (stamps
    // reviewedAt) and is terminal for re-verification (stage → complete).
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
    // Page over Cards, ordered by each Card's oldest unreviewed Sale, so nothing
    // rots at the bottom of the queue. The filter mirrors the read layer:
    // already-reviewed, cancelled, and invalid Sales never appear.
    const filter = Prisma.sql`"reviewedAt" IS NULL AND "status" NOT IN ('cancelled', 'invalid')`;

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
          status: { notIn: ["cancelled", "invalid"] },
        },
        // Best-Offers last (they need manual price entry) so the easy
        // pricing-relevant sales clear first.
        orderBy: [{ isBestOffer: "asc" }, { soldAt: "asc" }],
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

    // Preserve the oldest-first Card order from the paged raw query.
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
        status: { notIn: ["cancelled", "invalid"] },
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
