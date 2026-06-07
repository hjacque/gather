import { CardRepositoryPort } from "../repository/ports/card.repository.port";
import { PriceRepositoryPort } from "../repository/ports/price.repository.port";
import { PsaPopReportRepositoryPort } from "../repository/ports/psaPopReport.repository.port";
import { CollectionRepositoryPort } from "../repository/ports/collection.repository.port";
import { SaleRepositoryPort } from "../repository/ports/sale.repository.port";
import { SellerRepositoryPort } from "../repository/ports/seller.repository.port";
import { SyncUsecase } from "./sync/sync.usecase";
import { GetCardsUsecase } from "./card/getCards.usecase";
import { GetCardUsecase } from "./card/getCard.usecase";
import { UpdateCardNoteUsecase } from "./card/updateCardNote.usecase";
import { UpsertCollectionEntryUsecase } from "./card/upsertCollectionEntry.usecase";
import { DeleteCollectionEntryUsecase } from "./card/deleteCollectionEntry.usecase";
import { SyncSingleCardCardMarketUsecase } from "./sync/syncSingleCardCardMarket.usecase";
import { SyncSingleCardPsaUsecase } from "./sync/syncSingleCardPsa.usecase";
import { SyncPsaPopReportsUsecase } from "./sync/syncPsaPopReports.usecase";
import { SyncSalesUsecase } from "./sync/syncSales.usecase";
import { InvalidateSaleUsecase } from "./sale/invalidateSale.usecase";
import { ReviewSaleUsecase } from "./sale/reviewSale.usecase";
import { GetUnreviewedSalesUsecase } from "./sale/getUnreviewedSales.usecase";
import { CardMarketGradedSource } from "./sync/sources/cardmarketGraded.source";
import { EbaySalesSource } from "./sync/sources/ebaySales.source";
import { MarketSalePriceSnapshotService } from "./sale/marketSalePriceSnapshot";
import { GetOpportunitiesUsecase } from "./opportunities/getOpportunities.usecase";

export type Usecases = {
  syncUsecase: SyncUsecase;
  getCardsUsecase: GetCardsUsecase;
  getCardUsecase: GetCardUsecase;
  syncSingleCardCardMarketUsecase: SyncSingleCardCardMarketUsecase;
  syncSingleCardPsaUsecase: SyncSingleCardPsaUsecase;
  syncPsaPopReportsUsecase: SyncPsaPopReportsUsecase;
  syncSalesUsecase: SyncSalesUsecase;
  invalidateSaleUsecase: InvalidateSaleUsecase;
  reviewSaleUsecase: ReviewSaleUsecase;
  getUnreviewedSalesUsecase: GetUnreviewedSalesUsecase;
  updateCardNoteUsecase: UpdateCardNoteUsecase;
  upsertCollectionEntryUsecase: UpsertCollectionEntryUsecase;
  deleteCollectionEntryUsecase: DeleteCollectionEntryUsecase;
  getOpportunitiesUsecase: GetOpportunitiesUsecase;
};

export const initApplication = ({
  cardRepository,
  priceRepository,
  psaPopReportRepository,
  collectionRepository,
  saleRepository,
  sellerRepository,
}: {
  cardRepository: CardRepositoryPort;
  priceRepository: PriceRepositoryPort;
  psaPopReportRepository: PsaPopReportRepositoryPort;
  collectionRepository: CollectionRepositoryPort;
  saleRepository: SaleRepositoryPort;
  sellerRepository: SellerRepositoryPort;
}): Usecases => {
  const priceSources = [
    new CardMarketGradedSource(),
  ];

  const snapshotService = new MarketSalePriceSnapshotService(
    saleRepository,
    priceRepository
  );

  const syncSalesUsecase = new SyncSalesUsecase(
    cardRepository,
    saleRepository,
    new EbaySalesSource(sellerRepository),
    snapshotService
  );
  const syncUsecase = new SyncUsecase(
    cardRepository,
    priceRepository,
    priceSources,
    syncSalesUsecase
  );
  const getCardsUsecase = new GetCardsUsecase(
    cardRepository,
    priceRepository,
    psaPopReportRepository,
    collectionRepository,
    saleRepository
  );
  const getCardUsecase = new GetCardUsecase(
    cardRepository,
    priceRepository,
    psaPopReportRepository,
    collectionRepository,
    saleRepository
  );
  const cardmarketPriceSources = [
    new CardMarketGradedSource(),
  ];

  const syncSingleCardCardMarketUsecase = new SyncSingleCardCardMarketUsecase(
    cardRepository,
    priceRepository,
    cardmarketPriceSources,
    psaPopReportRepository,
    collectionRepository,
    saleRepository
  );

  const syncSingleCardPsaUsecase = new SyncSingleCardPsaUsecase(
    cardRepository,
    priceRepository,
    psaPopReportRepository,
    collectionRepository,
    saleRepository
  );
  const syncPsaPopReportsUsecase = new SyncPsaPopReportsUsecase(
    cardRepository,
    psaPopReportRepository
  );
  const invalidateSaleUsecase = new InvalidateSaleUsecase(saleRepository, snapshotService);
  const reviewSaleUsecase = new ReviewSaleUsecase(saleRepository, snapshotService);
  const getUnreviewedSalesUsecase = new GetUnreviewedSalesUsecase(saleRepository);
  const updateCardNoteUsecase = new UpdateCardNoteUsecase(cardRepository);
  const upsertCollectionEntryUsecase = new UpsertCollectionEntryUsecase(collectionRepository);
  const deleteCollectionEntryUsecase = new DeleteCollectionEntryUsecase(collectionRepository);

  const getOpportunitiesUsecase = new GetOpportunitiesUsecase(
    cardRepository,
    priceRepository,
    psaPopReportRepository,
    saleRepository
  );

  return {
    syncUsecase,
    getCardsUsecase,
    getCardUsecase,
    syncSingleCardCardMarketUsecase,
    syncSingleCardPsaUsecase,
    syncPsaPopReportsUsecase,
    syncSalesUsecase,
    invalidateSaleUsecase,
    reviewSaleUsecase,
    getUnreviewedSalesUsecase,
    updateCardNoteUsecase,
    upsertCollectionEntryUsecase,
    deleteCollectionEntryUsecase,
    getOpportunitiesUsecase,
  };
};
