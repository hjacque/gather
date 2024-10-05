import { PriceType } from "../../entities/price.entity";
import { CardRepositoryPort } from "../../repository/ports/card.repository.port";
import { PriceRepositoryPort } from "../../repository/ports/price.repository.port";

export class GetCardsUsecase {
  constructor(
    private readonly cardRepository: CardRepositoryPort,
    private readonly priceRepository: PriceRepositoryPort
  ) {}

  async execute() {
    const cards = await this.cardRepository.getCards();
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    for (const card of cards) {
      const performance = await this.priceRepository.getPerformance(card.id);
      card.performance = performance;

      const ratioPrice = await this.priceRepository.getCardPrice(
        card.id,
        PriceType.ratio,
        today
      );
      card.ratio = ratioPrice?.value || null;
    }

    console.log("GetCardsUsecase", cards);

    return cards;
  }
}
