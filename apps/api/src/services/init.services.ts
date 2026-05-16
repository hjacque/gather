import { SyncSchedulerService } from "./syncScheduler";
import { SyncUsecase } from "application/sync/sync.usecase";

export type Services = {
  syncSchedulerService: SyncSchedulerService;
};

export const initServices = ({
  syncUsecase,
}: {
  syncUsecase: SyncUsecase;
}): Services => {
  const syncSchedulerService = new SyncSchedulerService(syncUsecase);

  return {
    syncSchedulerService,
  };
};
