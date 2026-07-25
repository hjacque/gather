import { SyncUsecase } from "application/sync/sync.usecase";
import { SyncPsaPopReportsUsecase } from "application/sync/syncPsaPopReports.usecase";
import { SyncAuctionsUsecase } from "application/sync/syncAuctions.usecase";
import { Set } from "../entities/card.entity";
import cron from "node-cron";

export class SyncSchedulerService {
  constructor(
    private readonly syncUsecase: SyncUsecase,
    private readonly syncPsaPopReportsUsecase: SyncPsaPopReportsUsecase,
    private readonly syncAuctionsUsecase: SyncAuctionsUsecase
  ) {}

  async execute() {
    await this.scheduleSingles();
    await this.schedulePsaPopReports();
    await this.scheduleAuctions();
  }

  async sync(
    filter: {
      set?: Set;
    } = {}
  ) {
    try {
      console.log("🔄 Starting price update job...");

      await this.syncUsecase.execute({ mode: { headless: true }, filter });

      console.log(`✅ Updated prices`);
    } catch (error) {
      console.error("❌ Error updating product prices:", error);
    }
  }

  async scheduleSingles() {
    for (let hours = 0; hours < 24; hours += 2) {
      cron.schedule(
        `0 ${hours} * * *`,
        async () => {
          await this.sync();
        },
        {
          timezone: "UTC",
        }
      );
    }
    console.log("📅 Sync scheduler started (runs every two hours)");
  }

  async schedulePsaPopReports() {
    cron.schedule(
      "0 3 * * *",
      async () => {
        try {
          console.log("[PSA Sync] Starting scheduled PSA pop report sync...");
          await this.syncPsaPopReportsUsecase.execute();
          console.log("[PSA Sync] Scheduled PSA pop report sync complete");
        } catch (error) {
          console.error("[PSA Sync] Error in scheduled PSA pop report sync:", error);
        }
      },
      {
        timezone: "UTC",
      }
    );
    console.log("PSA pop report scheduler started (runs daily at 03:00 UTC)");
  }

  async scheduleAuctions() {
    for (let hours = 0; hours < 24; hours += 2) {
      cron.schedule(
        `15 ${hours} * * *`,
        async () => {
          try {
            console.log("[Auction Sync] Starting scheduled auction sync...");
            await this.syncAuctionsUsecase.executeBatch();
            console.log("[Auction Sync] Scheduled auction sync complete");
          } catch (error) {
            console.error("[Auction Sync] Error in scheduled auction sync:", error);
          }
        },
        {
          timezone: "UTC",
        }
      );
    }
    console.log("📅 Auction scheduler started (runs every two hours)");
  }
}
