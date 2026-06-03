import { SaleRepositoryPort } from "../../repository/ports/sale.repository.port";
import { getEurToUsdRate } from "../sync/helper";
import { convertToEur } from "./eurConverter";
import type {
  GetUnreviewedSalesResponse,
  ReviewSaleRecord,
} from "@gather/api-contract";

// The Sale Review queue: unreviewed Sales grouped by Card, paginated by Card,
// oldest unreviewed Sale first. Prices are converted to EUR at read time (today's
// rate); unconvertible currencies surface a null priceEur but are still shown so
// the admin can act on them.
export class GetUnreviewedSalesUsecase {
  constructor(private readonly saleRepository: SaleRepositoryPort) {}

  async execute(
    page: number,
    pageSize: number
  ): Promise<GetUnreviewedSalesResponse> {
    const [{ cards, totalCards }, usdToEur] = await Promise.all([
      this.saleRepository.getUnreviewedSalesByCard(page, pageSize),
      getEurToUsdRate(),
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
            isBestOffer: sale.isBestOffer,
            status: sale.status,
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
