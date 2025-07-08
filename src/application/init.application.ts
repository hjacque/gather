import { ProductRepositoryPort } from "../repository/ports/product.repository.port";
import { PriceRepositoryPort } from "../repository/ports/price.repository.port";
import { SyncUsecase } from "./core/sync.usecase";
import { GetBestRatioCardsTodayUsecase } from "./core/getBestRatioCardsToday.usecase";
import { GetCardsUsecase } from "./core/getCards.usecase";
import { GetCardUsecase } from "./core/getCard.usecase";
import { PerformanceRepositoryPort } from "../repository/ports/performance.repository.port";
import { ComputePerformancesUsecase } from "./core/computePerformance.usecase";
import { GetProductOfTheDayUsecase } from "./core/getProductOfTheDay.usecase";
import { SyncSingleUsecase } from "./core/syncSingle.usecase";
import { SetPerformancesUsecase } from "./core/setPerformances.usecase";

export type Usecases = {
  syncUsecase: SyncUsecase;
  getBestRatioCardsTodayUsecase: GetBestRatioCardsTodayUsecase;
  getCardsUsecase: GetCardsUsecase;
  getCardUsecase: GetCardUsecase;
  getProductOfTheDayUsecase: GetProductOfTheDayUsecase;
  syncSingleUsecase: SyncSingleUsecase;
  computePerformancesUsecase: ComputePerformancesUsecase;
  setPerformancesUsecase: SetPerformancesUsecase;
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
  const setPerformancesUsecase = new SetPerformancesUsecase(priceRepository, performanceRepository);
  const computePerformancesUsecase = new ComputePerformancesUsecase(
    productRepository,
    priceRepository,
    performanceRepository,
  );
  const syncUsecase = new SyncUsecase(
    productRepository,
    priceRepository,
    setPerformancesUsecase,
  );
  const getBestRatioCardsTodayUsecase = new GetBestRatioCardsTodayUsecase(
    priceRepository,
  );
  const getCardsUsecase = new GetCardsUsecase(
    productRepository,
    priceRepository,
    performanceRepository,
  );
  const getCardUsecase = new GetCardUsecase(productRepository, priceRepository);
  const getProductOfTheDayUsecase = new GetProductOfTheDayUsecase(
    productRepository,
    performanceRepository,
  );
  const syncSingleUsecase = new SyncSingleUsecase(
    productRepository,
    priceRepository,
    performanceRepository,
    setPerformancesUsecase,
  );

  return {
    syncUsecase,
    getBestRatioCardsTodayUsecase,
    getCardsUsecase,
    getCardUsecase,
    getProductOfTheDayUsecase,
    syncSingleUsecase,
    computePerformancesUsecase,
    setPerformancesUsecase,
  };
};
