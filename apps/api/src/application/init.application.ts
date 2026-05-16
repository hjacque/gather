import { ProductRepositoryPort } from "../repository/ports/product.repository.port";
import { PriceRepositoryPort } from "../repository/ports/price.repository.port";
import { SyncUsecase } from "./sync/sync.usecase";
import { GetProductsUsecase } from "./product/getProducts.usecase";
import { GetProductUsecase } from "./product/getProduct.usecase";
import { PerformanceRepositoryPort } from "../repository/ports/performance.repository.port";
import { GetProductOfTheDayUsecase } from "./product/getProductOfTheDay.usecase";
import { SyncSingleProductUsecase } from "./sync/syncSingleProduct.usecase";
import { SetPerformancesUsecase } from "./sync/setPerformances.usecase";

export type Usecases = {
  syncUsecase: SyncUsecase;
  getProductsUsecase: GetProductsUsecase;
  getProductUsecase: GetProductUsecase;
  getProductOfTheDayUsecase: GetProductOfTheDayUsecase;
  syncSingleProductUsecase: SyncSingleProductUsecase;
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
  const syncUsecase = new SyncUsecase(
    productRepository,
    priceRepository,
    setPerformancesUsecase,
  );
  const getProductsUsecase = new GetProductsUsecase(
    productRepository,
    priceRepository,
    performanceRepository,
  );
  const getProductUsecase = new GetProductUsecase(productRepository, priceRepository);
  const getProductOfTheDayUsecase = new GetProductOfTheDayUsecase(
    productRepository,
    performanceRepository,
  );
  const syncSingleProductUsecase = new SyncSingleProductUsecase(
    productRepository,
    priceRepository,
    performanceRepository,
    setPerformancesUsecase,
  );

  return {
    syncUsecase,
    getProductsUsecase,
    getProductUsecase,
    getProductOfTheDayUsecase,
    syncSingleProductUsecase,
    setPerformancesUsecase,
  };
};
