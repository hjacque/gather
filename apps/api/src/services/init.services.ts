import { SyncSchedulerService } from "./syncScheduler";
import { SyncUsecase } from "application/sync/sync.usecase";
import { SyncPsaPopReportsUsecase } from "application/sync/syncPsaPopReports.usecase";
import { SyncAuctionsUsecase } from "application/sync/syncAuctions.usecase";

export type Services = {
  syncSchedulerService: SyncSchedulerService;
};

export const initServices = ({
  syncUsecase,
  syncPsaPopReportsUsecase,
  syncAuctionsUsecase,
}: {
  syncUsecase: SyncUsecase;
  syncPsaPopReportsUsecase: SyncPsaPopReportsUsecase;
  syncAuctionsUsecase: SyncAuctionsUsecase;
}): Services => {
  const syncSchedulerService = new SyncSchedulerService(
    syncUsecase,
    syncPsaPopReportsUsecase,
    syncAuctionsUsecase
  );

  return {
    syncSchedulerService,
  };
};
