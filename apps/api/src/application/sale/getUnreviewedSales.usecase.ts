import {
  SaleRepositoryPort,
  UnreviewedSalesCursor,
} from "../../repository/ports/sale.repository.port";
import { getUsdToEurRate } from "../sync/helper";
import { convertToEur } from "./eurConverter";
import type {
  GetUnreviewedSalesResponse,
  ReviewSaleRecord,
} from "@gather/api-contract";

const encodeCursor = (cursor: UnreviewedSalesCursor): string =>
  Buffer.from(`${cursor.oldestSoldAt.toISOString()}|${cursor.cardId}`).toString(
    "base64url"
  );

export const decodeCursor = (
  raw: string | undefined
): UnreviewedSalesCursor | undefined => {
  if (!raw) return undefined;
  const [soldAt, cardId] = Buffer.from(raw, "base64url")
    .toString("utf8")
    .split("|");
  const oldestSoldAt = new Date(soldAt ?? "");
  if (!cardId || Number.isNaN(oldestSoldAt.getTime())) return undefined;
  return { oldestSoldAt, cardId };
};

export class GetUnreviewedSalesUsecase {
  constructor(private readonly saleRepository: SaleRepositoryPort) {}

  async execute(
    pageSize: number,
    after?: UnreviewedSalesCursor
  ): Promise<GetUnreviewedSalesResponse> {
    const [{ cards, totalCards, nextCursor }, usdToEur] = await Promise.all([
      this.saleRepository.getUnreviewedSalesByCard(pageSize, after),
      getUsdToEurRate(),
    ]);

    return {
      cards: cards.map(({ card, sales }) => ({
        id: card.id,
        name: card.name,
        number: card.number,
        set: card.setName,
        imageUrl: card.imageUrl,
        sales: sales.map(
          (sale): ReviewSaleRecord => ({
            id: sale.id,
            title: sale.title,
            psaGrade: sale.psaGrade,
            price: sale.price,
            currency: sale.currency,
            priceEur: convertToEur(sale.price, sale.currency, usdToEur),
            soldAt: sale.soldAt,
            status: sale.status,
            isBestOffer: sale.isBestOffer,
            url: `https://www.ebay.com/itm/${sale.itemId}`,
          })
        ),
      })),
      totalCards,
      pageSize,
      nextCursor: nextCursor ? encodeCursor(nextCursor) : null,
    };
  }

  async count(): Promise<{ count: number }> {
    return { count: await this.saleRepository.getUnreviewedCount() };
  }
}
