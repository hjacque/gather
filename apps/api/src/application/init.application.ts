import { CardRepositoryPort } from "../repository/ports/card.repository.port";
import { PriceRepositoryPort } from "../repository/ports/price.repository.port";
import { PsaPopReportRepositoryPort } from "../repository/ports/psaPopReport.repository.port";
import { CollectionRepositoryPort } from "../repository/ports/collection.repository.port";
import { SaleRepositoryPort } from "../repository/ports/sale.repository.port";
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
import { CardMarketGradedSource } from "./sync/sources/cardmarketGraded.source";
import { EbaySalesSource } from "./sync/sources/ebaySales.source";

export type Usecases = {
  syncUsecase: SyncUsecase;
  getCardsUsecase: GetCardsUsecase;
  getCardUsecase: GetCardUsecase;
  syncSingleCardCardMarketUsecase: SyncSingleCardCardMarketUsecase;
  syncSingleCardPsaUsecase: SyncSingleCardPsaUsecase;
  syncPsaPopReportsUsecase: SyncPsaPopReportsUsecase;
  syncSalesUsecase: SyncSalesUsecase;
  updateCardNoteUsecase: UpdateCardNoteUsecase;
  upsertCollectionEntryUsecase: UpsertCollectionEntryUsecase;
  deleteCollectionEntryUsecase: DeleteCollectionEntryUsecase;
};

export const initApplication = ({
  cardRepository,
  priceRepository,
  psaPopReportRepository,
  collectionRepository,
  saleRepository,
}: {
  cardRepository: CardRepositoryPort;
  priceRepository: PriceRepositoryPort;
  psaPopReportRepository: PsaPopReportRepositoryPort;
  collectionRepository: CollectionRepositoryPort;
  saleRepository: SaleRepositoryPort;
}): Usecases => {
  const priceSources = [
    new CardMarketGradedSource(),
  ];

  const syncUsecase = new SyncUsecase(
    cardRepository,
    priceRepository,
    priceSources
  );
  const getCardsUsecase = new GetCardsUsecase(
    cardRepository,
    priceRepository,
    psaPopReportRepository,
    collectionRepository
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
    collectionRepository
  );

  const syncSingleCardPsaUsecase = new SyncSingleCardPsaUsecase(
    cardRepository,
    priceRepository,
    psaPopReportRepository,
    collectionRepository
  );
  const syncPsaPopReportsUsecase = new SyncPsaPopReportsUsecase(
    cardRepository,
    psaPopReportRepository
  );
  const syncSalesUsecase = new SyncSalesUsecase(
    cardRepository,
    saleRepository,
    new EbaySalesSource()
  );
  const updateCardNoteUsecase = new UpdateCardNoteUsecase(cardRepository);
  const upsertCollectionEntryUsecase = new UpsertCollectionEntryUsecase(collectionRepository);
  const deleteCollectionEntryUsecase = new DeleteCollectionEntryUsecase(collectionRepository);

  return {
    syncUsecase,
    getCardsUsecase,
    getCardUsecase,
    syncSingleCardCardMarketUsecase,
    syncSingleCardPsaUsecase,
    syncPsaPopReportsUsecase,
    syncSalesUsecase,
    updateCardNoteUsecase,
    upsertCollectionEntryUsecase,
    deleteCollectionEntryUsecase,
  };
};
