import { CardRepositoryPort } from "../repository/ports/card.repository.port";
import { PriceRepositoryPort } from "../repository/ports/price.repository.port";
import { SyncUsecase } from "./core/sync.usecase";
import { GetBestRatioCardsTodayUsecase } from "./core/getBestRatioCardsToday.usecase";

export type Usecases = {
  syncUsecase: SyncUsecase;
  getBestRatioCardsTodayUsecase: GetBestRatioCardsTodayUsecase;
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

  return {
    syncUsecase,
    getBestRatioCardsTodayUsecase,
  };
};
