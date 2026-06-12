import { CardRepositoryPort } from "../repository/ports/card.repository.port";
import { PriceRepositoryPort } from "../repository/ports/price.repository.port";
import { PsaPopReportRepositoryPort } from "../repository/ports/psaPopReport.repository.port";
import { CollectionRepositoryPort } from "../repository/ports/collection.repository.port";
import { SaleRepositoryPort } from "../repository/ports/sale.repository.port";
import { ListingRepositoryPort } from "../repository/ports/listing.repository.port";
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
import { SyncListingsUsecase } from "./sync/syncListings.usecase";
import { SyncSingleListingUsecase } from "./sync/syncSingleListing.usecase";
import { InvalidateSaleUsecase } from "./sale/invalidateSale.usecase";
import { InvalidateListingUsecase } from "./listing/invalidateListing.usecase";
import { ReviewSaleUsecase } from "./sale/reviewSale.usecase";
import { GetUnreviewedSalesUsecase } from "./sale/getUnreviewedSales.usecase";
import { CardMarketGradedSource } from "./sync/sources/cardmarketGraded.source";
import { EbaySalesSource } from "./sync/sources/ebaySales.source";
import { EbayListingsSource } from "./sync/sources/ebayListings.source";
import { EbayItemPageSource } from "./sync/sources/ebayItemPage.source";
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
  syncListingsUsecase: SyncListingsUsecase;
  syncSingleListingUsecase: SyncSingleListingUsecase;
  invalidateSaleUsecase: InvalidateSaleUsecase;
  invalidateListingUsecase: InvalidateListingUsecase;
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
  listingRepository,
}: {
  cardRepository: CardRepositoryPort;
  priceRepository: PriceRepositoryPort;
  psaPopReportRepository: PsaPopReportRepositoryPort;
  collectionRepository: CollectionRepositoryPort;
  saleRepository: SaleRepositoryPort;
  listingRepository: ListingRepositoryPort;
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
    new EbaySalesSource(),
    snapshotService
  );
  const syncListingsUsecase = new SyncListingsUsecase(
    cardRepository,
    listingRepository,
    new EbayListingsSource(),
    new EbayItemPageSource()
  );
  const syncSingleListingUsecase = new SyncSingleListingUsecase(
    listingRepository,
    new EbayItemPageSource()
  );
  const syncUsecase = new SyncUsecase(
    cardRepository,
    priceSources,
    syncSalesUsecase,
    syncListingsUsecase,
    listingRepository
  );
  const getCardsUsecase = new GetCardsUsecase(
    cardRepository,
    psaPopReportRepository,
    collectionRepository,
    saleRepository
  );
  const getCardUsecase = new GetCardUsecase(
    cardRepository,
    psaPopReportRepository,
    collectionRepository,
    saleRepository,
    listingRepository
  );
  const cardmarketPriceSources = [
    new CardMarketGradedSource(),
  ];

  const syncSingleCardCardMarketUsecase = new SyncSingleCardCardMarketUsecase(
    cardRepository,
    cardmarketPriceSources,
    psaPopReportRepository,
    collectionRepository,
    saleRepository,
    listingRepository
  );

  const syncSingleCardPsaUsecase = new SyncSingleCardPsaUsecase(
    cardRepository,
    psaPopReportRepository,
    collectionRepository,
    saleRepository
  );
  const syncPsaPopReportsUsecase = new SyncPsaPopReportsUsecase(
    cardRepository,
    psaPopReportRepository
  );
  const invalidateSaleUsecase = new InvalidateSaleUsecase(saleRepository, snapshotService);
  const invalidateListingUsecase = new InvalidateListingUsecase(listingRepository);
  const reviewSaleUsecase = new ReviewSaleUsecase(saleRepository, snapshotService);
  const getUnreviewedSalesUsecase = new GetUnreviewedSalesUsecase(saleRepository);
  const updateCardNoteUsecase = new UpdateCardNoteUsecase(cardRepository);
  const upsertCollectionEntryUsecase = new UpsertCollectionEntryUsecase(collectionRepository);
  const deleteCollectionEntryUsecase = new DeleteCollectionEntryUsecase(collectionRepository);

  const getOpportunitiesUsecase = new GetOpportunitiesUsecase(
    cardRepository,
    priceRepository,
    psaPopReportRepository,
    saleRepository,
    listingRepository
  );

  return {
    syncUsecase,
    getCardsUsecase,
    getCardUsecase,
    syncSingleCardCardMarketUsecase,
    syncSingleCardPsaUsecase,
    syncPsaPopReportsUsecase,
    syncSalesUsecase,
    syncListingsUsecase,
    syncSingleListingUsecase,
    invalidateSaleUsecase,
    invalidateListingUsecase,
    reviewSaleUsecase,
    getUnreviewedSalesUsecase,
    updateCardNoteUsecase,
    upsertCollectionEntryUsecase,
    deleteCollectionEntryUsecase,
    getOpportunitiesUsecase,
  };
};
