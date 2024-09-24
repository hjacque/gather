import { CARDMARKET_FEE } from "../../constants";
import { CardRepositoryPort } from "../../repository/ports/card.repository.port";

export class GetOpportunitiesUsecase {
  constructor(private readonly cardRepository: CardRepositoryPort) {}

  async execute() {
    const cards = await this.cardRepository.getCards();
    if (!cards) {
      return [];
    }
    const opportunities = cards
      .map((card) => {
        if (!card.cardMarketPrice || !card.marketPrice) {
          return;
        }
        const buyPrice = card.cardMarketPrice / (1 - CARDMARKET_FEE);
        const sellPrice = card.marketPrice;
        const profit = sellPrice - buyPrice;
        if (profit < 0) {
          return;
        }
        return {
          cardName: card.name,
          buyPrice,
          sellPrice,
          profit,
          link:
            card.cardMarketLink +
            "?language=1&minCondition=2&isSigned=N&isAltered=N",
        };
      })
      .filter(Boolean)
      .sort((a, b) => a!.profit - b!.profit);
    if (opportunities.length) {
      console.log("opportunities", opportunities);
    }

    return opportunities;
  }
}
