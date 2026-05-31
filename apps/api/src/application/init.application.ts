import { ProductRepositoryPort } from "../repository/ports/product.repository.port";
import { PriceRepositoryPort } from "../repository/ports/price.repository.port";
import { PsaPopReportRepositoryPort } from "../repository/ports/psaPopReport.repository.port";
import { CollectionRepositoryPort } from "../repository/ports/collection.repository.port";
import { SyncUsecase } from "./sync/sync.usecase";
import { GetProductsUsecase } from "./product/getProducts.usecase";
import { GetProductUsecase } from "./product/getProduct.usecase";
import { UpdateProductNoteUsecase } from "./product/updateProductNote.usecase";
import { UpsertCollectionEntryUsecase } from "./product/upsertCollectionEntry.usecase";
import { DeleteCollectionEntryUsecase } from "./product/deleteCollectionEntry.usecase";
import { SyncSingleProductCardMarketUsecase } from "./sync/syncSingleProductCardMarket.usecase";
import { SyncSingleProductPsaUsecase } from "./sync/syncSingleProductPsa.usecase";
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
  syncSingleProductCardMarketUsecase: SyncSingleProductCardMarketUsecase;
  syncSingleProductPsaUsecase: SyncSingleProductPsaUsecase;
  syncPsaPopReportsUsecase: SyncPsaPopReportsUsecase;
  updateProductNoteUsecase: UpdateProductNoteUsecase;
  upsertCollectionEntryUsecase: UpsertCollectionEntryUsecase;
  deleteCollectionEntryUsecase: DeleteCollectionEntryUsecase;
};

export const initApplication = ({
  productRepository,
  priceRepository,
  psaPopReportRepository,
  collectionRepository,
}: {
  productRepository: ProductRepositoryPort;
  priceRepository: PriceRepositoryPort;
  psaPopReportRepository: PsaPopReportRepositoryPort;
  collectionRepository: CollectionRepositoryPort;
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

  const syncUsecase = new SyncUsecase(
    productRepository,
    priceRepository,
    priceSources
  );
  const getProductsUsecase = new GetProductsUsecase(
    productRepository,
    priceRepository,
    psaPopReportRepository,
    collectionRepository
  );
  const getProductUsecase = new GetProductUsecase(
    productRepository,
    priceRepository,
    psaPopReportRepository,
    collectionRepository
  );
  const cardmarketPriceSources = [
    new CardMarketSource(),
    new CardMarketGradedSource(),
  ];

  const syncSingleProductCardMarketUsecase = new SyncSingleProductCardMarketUsecase(
    productRepository,
    priceRepository,
    cardmarketPriceSources,
    psaPopReportRepository,
    collectionRepository
  );

  const syncSingleProductPsaUsecase = new SyncSingleProductPsaUsecase(
    productRepository,
    priceRepository,
    psaPopReportRepository,
    collectionRepository
  );
  const syncPsaPopReportsUsecase = new SyncPsaPopReportsUsecase(
    productRepository,
    psaPopReportRepository
  );
  const updateProductNoteUsecase = new UpdateProductNoteUsecase(productRepository);
  const upsertCollectionEntryUsecase = new UpsertCollectionEntryUsecase(collectionRepository);
  const deleteCollectionEntryUsecase = new DeleteCollectionEntryUsecase(collectionRepository);

  return {
    syncUsecase,
    getProductsUsecase,
    getProductUsecase,
    syncSingleProductCardMarketUsecase,
    syncSingleProductPsaUsecase,
    syncPsaPopReportsUsecase,
    updateProductNoteUsecase,
    upsertCollectionEntryUsecase,
    deleteCollectionEntryUsecase,
  };
};
