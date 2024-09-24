import { CardRepositoryPort } from "../repository/ports/card.repository.port";
import { GetOpportunitiesUsecase } from "./core/getOpportunities.usecase";
import { SyncUsecase } from "./core/sync.usecase";

export type Usecases = {
  syncUsecase: SyncUsecase;
  getOpportunitiesUsecase: GetOpportunitiesUsecase;
};

export const initApplication = ({
  cardRepository,
}: {
  cardRepository: CardRepositoryPort;
}): Usecases => {
  const syncUsecase = new SyncUsecase(cardRepository);
  const getOpportunitiesUsecase = new GetOpportunitiesUsecase(cardRepository);

  return {
    syncUsecase,
    getOpportunitiesUsecase,
  };
};
