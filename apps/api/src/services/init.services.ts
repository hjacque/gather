import { SyncSchedulerService } from "./syncScheduler";
import { SyncUsecase } from "application/sync/sync.usecase";
import { SyncPsaPopReportsUsecase } from "application/sync/syncPsaPopReports.usecase";

export type Services = {
  syncSchedulerService: SyncSchedulerService;
};

export const initServices = ({
  syncUsecase,
  syncPsaPopReportsUsecase,
}: {
  syncUsecase: SyncUsecase;
  syncPsaPopReportsUsecase: SyncPsaPopReportsUsecase;
}): Services => {
  const syncSchedulerService = new SyncSchedulerService(
    syncUsecase,
    syncPsaPopReportsUsecase
  );

  return {
    syncSchedulerService,
  };
};
