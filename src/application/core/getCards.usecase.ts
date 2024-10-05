import { CardRepositoryPort } from "../../repository/ports/card.repository.port";
import { PriceRepositoryPort } from "../../repository/ports/price.repository.port";

export class GetCardsUsecase {
  constructor(
    private readonly cardRepository: CardRepositoryPort,
    private readonly priceRepository: PriceRepositoryPort
  ) {}

  async execute() {
    const cards = await this.cardRepository.getCards();

    for (const card of cards) {
      const performance = await this.priceRepository.getPerformance(card.id);
      card.performance = performance;
    }

    console.log("GetCardsUsecase", cards);

    return cards;
  }
}
