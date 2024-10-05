import { CardEntity } from "../../entities/card.entity";
import { PriceEntity } from "../../entities/price.entity";
import { CardRepositoryPort } from "../../repository/ports/card.repository.port";
import { PriceRepositoryPort } from "../../repository/ports/price.repository.port";

export class GetCardUsecase {
  constructor(
    private readonly cardRepository: CardRepositoryPort,
    private readonly priceRepository: PriceRepositoryPort
  ) {}

  async execute(cardId: string): Promise<
    CardEntity & {
      marketPrices: PriceEntity[];
      buylistPrices: PriceEntity[];
      estimatedPrices: PriceEntity[];
      ratioPrices: PriceEntity[];
    }
  > {
    const card = await this.cardRepository.getCard(cardId);
    const cardPrices = await this.priceRepository.getCardPrices(cardId);

    return {
      ...card,
      ...cardPrices,
    };
  }
}
