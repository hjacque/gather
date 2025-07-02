import { ProductRepositoryPort } from "../repository/ports/product.repository.port";
import { PriceRepositoryPort } from "../repository/ports/price.repository.port";
import { SyncUsecase } from "./core/sync.usecase";
import { GetBestRatioCardsTodayUsecase } from "./core/getBestRatioCardsToday.usecase";
import { GetCardsUsecase } from "./core/getCards.usecase";
import { GetCardUsecase } from "./core/getCard.usecase";
import { PerformanceRepositoryPort } from "../repository/ports/performance.repository.port";
import { ComputePerformancesUsecase } from "./core/computePerformance.usecase";
import { GetCardOfTheDayUsecase } from "./core/getCardOfTheDay.usecase";
import { SyncSingleUsecase } from "./core/syncSingle.usecase";

export type Usecases = {
  syncUsecase: SyncUsecase;
  getBestRatioCardsTodayUsecase: GetBestRatioCardsTodayUsecase;
  getCardsUsecase: GetCardsUsecase;
  getCardUsecase: GetCardUsecase;
  getCardOfTheDayUsecase: GetCardOfTheDayUsecase;
  syncSingleUsecase: SyncSingleUsecase;
  computePerformancesUsecase: ComputePerformancesUsecase;
};

export const initApplication = ({
  productRepository,
  priceRepository,
  performanceRepository,
}: {
  productRepository: ProductRepositoryPort;
  priceRepository: PriceRepositoryPort;
  performanceRepository: PerformanceRepositoryPort;
}): Usecases => {
  const computePerformancesUsecase = new ComputePerformancesUsecase(
    productRepository,
    priceRepository,
    performanceRepository
  );
  const syncUsecase = new SyncUsecase(
    productRepository,
    priceRepository,
    computePerformancesUsecase
  );
  const getBestRatioCardsTodayUsecase = new GetBestRatioCardsTodayUsecase(
    priceRepository
  );
  const getCardsUsecase = new GetCardsUsecase(
    productRepository,
    priceRepository,
    performanceRepository
  );
  const getCardUsecase = new GetCardUsecase(productRepository, priceRepository);
  const getCardOfTheDayUsecase = new GetCardOfTheDayUsecase(
    productRepository,
    performanceRepository
  );
  const syncSingleUsecase = new SyncSingleUsecase(
    productRepository,
    priceRepository,
    computePerformancesUsecase
  );

  return {
    syncUsecase,
    getBestRatioCardsTodayUsecase,
    getCardsUsecase,
    getCardUsecase,
    getCardOfTheDayUsecase,
    syncSingleUsecase,
    computePerformancesUsecase,
  };
};
