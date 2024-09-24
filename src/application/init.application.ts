import { CardRepositoryPort } from "../repository/ports/card.repository.port";
import { SyncUsecase } from "./core/sync.usecase";

export type Usecases = {
  syncUsecase: SyncUsecase;
};

export const initApplication = ({
  cardRepository,
}: {
  cardRepository: CardRepositoryPort;
}): Usecases => {
  const syncUsecase = new SyncUsecase(cardRepository);

  return {
    syncUsecase,
  };
};
