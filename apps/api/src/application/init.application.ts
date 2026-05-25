import { ProductRepositoryPort } from "../repository/ports/product.repository.port";
import { PriceRepositoryPort } from "../repository/ports/price.repository.port";
import { PsaPopReportRepositoryPort } from "../repository/ports/psaPopReport.repository.port";
import { SyncUsecase } from "./sync/sync.usecase";
import { GetProductsUsecase } from "./product/getProducts.usecase";
import { GetProductUsecase } from "./product/getProduct.usecase";
import { PerformanceRepositoryPort } from "../repository/ports/performance.repository.port";
import { GetProductOfTheDayUsecase } from "./product/getProductOfTheDay.usecase";
import { UpdateProductNoteUsecase } from "./product/updateProductNote.usecase";
import { SyncSingleProductCardMarketUsecase } from "./sync/syncSingleProductCardMarket.usecase";
import { SyncSingleProductPsaUsecase } from "./sync/syncSingleProductPsa.usecase";
import { SetPerformancesUsecase } from "./sync/setPerformances.usecase";
import { SyncPsaPopReportsUsecase } from "./sync/syncPsaPopReports.usecase";
import { CardMarketSource } from "./sync/sources/cardmarket.source";
import { CardMarketGradedSource } from "./sync/sources/cardmarketGraded.source";
import { CardKingdomSource } from "./sync/sources/cardkingdom.source";
import { AbugamesSource } from "./sync/sources/abugames.source";
import { FullSetSource } from "./sync/sources/fullSet.source";
import { TcgpSource } from "./sync/sources/tcgp.source";
import { BricklinkSource } from "./sync/sources/bricklink.source";
import { BricklinkAverageSource } from "./sync/sources/bricklinkAverage.source";

export type Usecases = {
  syncUsecase: SyncUsecase;
  getProductsUsecase: GetProductsUsecase;
  getProductUsecase: GetProductUsecase;
  getProductOfTheDayUsecase: GetProductOfTheDayUsecase;
  syncSingleProductCardMarketUsecase: SyncSingleProductCardMarketUsecase;
  syncSingleProductPsaUsecase: SyncSingleProductPsaUsecase;
  setPerformancesUsecase: SetPerformancesUsecase;
  syncPsaPopReportsUsecase: SyncPsaPopReportsUsecase;
  updateProductNoteUsecase: UpdateProductNoteUsecase;
};

export const initApplication = ({
  productRepository,
  priceRepository,
  performanceRepository,
  psaPopReportRepository,
}: {
  productRepository: ProductRepositoryPort;
  priceRepository: PriceRepositoryPort;
  performanceRepository: PerformanceRepositoryPort;
  psaPopReportRepository: PsaPopReportRepositoryPort;
}): Usecases => {
  const priceSources = [
    new CardMarketSource(),
    new CardMarketGradedSource(),
    new BricklinkSource(),
    new CardKingdomSource(),
    new AbugamesSource(),
    new FullSetSource(),
    new TcgpSource(),
    new BricklinkAverageSource(),
  ];

  const setPerformancesUsecase = new SetPerformancesUsecase(
    priceRepository,
    performanceRepository
  );
  const syncUsecase = new SyncUsecase(
    productRepository,
    priceRepository,
    setPerformancesUsecase,
    priceSources
  );
  const getProductsUsecase = new GetProductsUsecase(
    productRepository,
    priceRepository,
    performanceRepository,
    psaPopReportRepository
  );
  const getProductUsecase = new GetProductUsecase(
    productRepository,
    priceRepository,
    psaPopReportRepository
  );
  const getProductOfTheDayUsecase = new GetProductOfTheDayUsecase(
    productRepository,
    performanceRepository
  );
  const cardmarketPriceSources = [
    new CardMarketSource(),
    new CardMarketGradedSource(),
  ];

  const syncSingleProductCardMarketUsecase = new SyncSingleProductCardMarketUsecase(
    productRepository,
    priceRepository,
    performanceRepository,
    setPerformancesUsecase,
    cardmarketPriceSources,
    psaPopReportRepository
  );

  const syncSingleProductPsaUsecase = new SyncSingleProductPsaUsecase(
    productRepository,
    priceRepository,
    performanceRepository,
    psaPopReportRepository
  );
  const syncPsaPopReportsUsecase = new SyncPsaPopReportsUsecase(
    productRepository,
    psaPopReportRepository
  );
  const updateProductNoteUsecase = new UpdateProductNoteUsecase(productRepository);

  return {
    syncUsecase,
    getProductsUsecase,
    getProductUsecase,
    getProductOfTheDayUsecase,
    syncSingleProductCardMarketUsecase,
    syncSingleProductPsaUsecase,
    setPerformancesUsecase,
    syncPsaPopReportsUsecase,
    updateProductNoteUsecase,
  };
};
