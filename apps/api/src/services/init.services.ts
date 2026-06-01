import { SyncSchedulerService } from "./syncScheduler";
import { SyncUsecase } from "application/sync/sync.usecase";
import { SyncPsaPopReportsUsecase } from "application/sync/syncPsaPopReports.usecase";
import { SyncSalesUsecase } from "application/sync/syncSales.usecase";

export type Services = {
  syncSchedulerService: SyncSchedulerService;
};

export const initServices = ({
  syncUsecase,
  syncPsaPopReportsUsecase,
  syncSalesUsecase,
}: {
  syncUsecase: SyncUsecase;
  syncPsaPopReportsUsecase: SyncPsaPopReportsUsecase;
  syncSalesUsecase: SyncSalesUsecase;
}): Services => {
  const syncSchedulerService = new SyncSchedulerService(
    syncUsecase,
    syncPsaPopReportsUsecase,
    syncSalesUsecase
  );

  return {
    syncSchedulerService,
  };
};
