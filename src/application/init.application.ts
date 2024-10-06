import { CardRepositoryPort } from "../repository/ports/card.repository.port";
import { PriceRepositoryPort } from "../repository/ports/price.repository.port";
import { SyncUsecase } from "./core/sync.usecase";
import { GetBestRatioCardsTodayUsecase } from "./core/getBestRatioCardsToday.usecase";
import { GetCardsUsecase } from "./core/getCards.usecase";
import { GetCardUsecase } from "./core/getCard.usecase";
import { PerformanceRepositoryPort } from "../repository/ports/performance.repository.port";
import { ComputePerformancesUsecase } from "./core/computePerformance.usecase";

export type Usecases = {
  syncUsecase: SyncUsecase;
  getBestRatioCardsTodayUsecase: GetBestRatioCardsTodayUsecase;
  getCardsUsecase: GetCardsUsecase;
  getCardUsecase: GetCardUsecase;
};

export const initApplication = ({
  cardRepository,
  priceRepository,
  performanceRepository,
}: {
  cardRepository: CardRepositoryPort;
  priceRepository: PriceRepositoryPort;
  performanceRepository: PerformanceRepositoryPort;
}): Usecases => {
  const computePerformancesUsecase = new ComputePerformancesUsecase(
    cardRepository,
    priceRepository,
    performanceRepository
  );
  const syncUsecase = new SyncUsecase(
    cardRepository,
    priceRepository,
    computePerformancesUsecase
  );
  const getBestRatioCardsTodayUsecase = new GetBestRatioCardsTodayUsecase(
    priceRepository
  );
  const getCardsUsecase = new GetCardsUsecase(
    cardRepository,
    priceRepository,
    performanceRepository
  );
  const getCardUsecase = new GetCardUsecase(cardRepository, priceRepository);

  return {
    syncUsecase,
    getBestRatioCardsTodayUsecase,
    getCardsUsecase,
    getCardUsecase,
  };
};
