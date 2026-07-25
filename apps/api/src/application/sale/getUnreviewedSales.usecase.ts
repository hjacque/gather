import { SaleRepositoryPort } from "../../repository/ports/sale.repository.port";
import { getUsdToEurRate } from "../sync/helper";
import { convertToEur } from "./eurConverter";
import type {
  GetUnreviewedSalesResponse,
  ReviewSaleRecord,
} from "@gather/api-contract";

export class GetUnreviewedSalesUsecase {
  constructor(private readonly saleRepository: SaleRepositoryPort) {}

  async execute(
    page: number,
    pageSize: number
  ): Promise<GetUnreviewedSalesResponse> {
    const [{ cards, totalCards }, usdToEur] = await Promise.all([
      this.saleRepository.getUnreviewedSalesByCard(page, pageSize),
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
      page,
      pageSize,
    };
  }

  async count(): Promise<{ count: number }> {
    return { count: await this.saleRepository.getUnreviewedCount() };
  }
}
