import { CardRepositoryPort } from "../repository/ports/card.repository.port";
import { PriceRepositoryPort } from "../repository/ports/price.repository.port";
import { SyncUsecase } from "./core/sync.usecase";
import { GetBestRatioCardsTodayUsecase } from "./core/getBestRatioCardsToday.usecase";
import { GetCardsUsecase } from "./core/getCards.usecase";
import { GetCardUsecase } from "./core/getCard.usecase";

export type Usecases = {
  syncUsecase: SyncUsecase;
  getBestRatioCardsTodayUsecase: GetBestRatioCardsTodayUsecase;
  getCardsUsecase: GetCardsUsecase;
  getCardUsecase: GetCardUsecase;
};

export const initApplication = ({
  cardRepository,
  priceRepository,
}: {
  cardRepository: CardRepositoryPort;
  priceRepository: PriceRepositoryPort;
}): Usecases => {
  const syncUsecase = new SyncUsecase(cardRepository, priceRepository);
  const getBestRatioCardsTodayUsecase = new GetBestRatioCardsTodayUsecase(
    priceRepository
  );
  const getCardsUsecase = new GetCardsUsecase(cardRepository, priceRepository);
  const getCardUsecase = new GetCardUsecase(cardRepository, priceRepository);

  return {
    syncUsecase,
    getBestRatioCardsTodayUsecase,
    getCardsUsecase,
    getCardUsecase,
  };
};
