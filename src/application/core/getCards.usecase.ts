import { CardRepositoryPort } from "../../repository/ports/card.repository.port";
import { PerformanceRepositoryPort } from "../../repository/ports/performance.repository.port";
import { PriceRepositoryPort } from "../../repository/ports/price.repository.port";

export class GetCardsUsecase {
  constructor(
    private readonly cardRepository: CardRepositoryPort,
    private readonly priceRepository: PriceRepositoryPort,
    private readonly performanceRepository: PerformanceRepositoryPort
  ) {}

  async execute() {
    const cards = await this.cardRepository.getCards();
    const cardIds = cards.map((card) => card.id);

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const prices = await this.priceRepository.getCardsPricesByDate(
      cardIds,
      today
    );
    const performances = await this.performanceRepository.getPerformances(
      cardIds,
      today
    );

    return cards.map((card) => {
      const { market, buylist, ratio } = prices.get(card.id)!;
      const performance = performances.get(card.id)!;
      return {
        ...card,
        market,
        buylist,
        ratio,
        performance,
      };
    });
  }
}
