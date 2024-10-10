import { CardEntity } from "../../entities/card.entity";
import { PerformanceEntity } from "../../entities/performance.entity";
import { CardRepositoryPort } from "../../repository/ports/card.repository.port";
import { PerformanceRepositoryPort } from "../../repository/ports/performance.repository.port";

export class GetCardOfTheDayUsecase {
  constructor(
    private readonly cardRepository: CardRepositoryPort,
    private readonly performanceRepository: PerformanceRepositoryPort
  ) {}

  async execute(): Promise<
    (CardEntity & { topPerformance: PerformanceEntity }) | undefined
  > {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const topPerformance =
      await this.performanceRepository.getTopPerformance(today);

    console.log("topPerformance", topPerformance);

    if (!topPerformance) {
      return undefined;
    }

    const card = await this.cardRepository.getCard(topPerformance.cardId);

    return {
      ...card,
      topPerformance,
    };
  }
}
