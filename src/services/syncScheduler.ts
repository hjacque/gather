import { SyncUsecase } from "application/sync/sync.usecase";
import { Franchise, ProductType, Set } from "../entities/product.entity";
import cron from "node-cron";

export class SyncSchedulerService {
  constructor(private readonly syncUsecase: SyncUsecase) {}

  async execute() {
    await this.scheduleSingles();
    await this.scheduleSealed();

    // Run immediately on startup (for testing)
    // setTimeout(async () => {
    //     await this.sync({type: ["booster_box", "collector_booster_box", "booster_bundle", "booster_box_18", "elite_trainer_box"]});
    // }, 5000);
  }

  async sync(
    filter: {
      set?: Set;
      franchise?: Franchise;
      type?: ProductType | ProductType[];
    } = {},
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
    for (let hours = 0; hours < 24; hours+= 1) {
      cron.schedule(
        `0 ${hours} * * *`,
        async () => {
          await this.sync({ type: "single" });
        },
        {
          timezone: "UTC",
        },
      );
    }
    console.log("📅 Sync scheduler started (runs every hour at 00)", { type: "single" });
  }

  async scheduleSealed() {
    for (let hours = 0; hours < 24; hours++) {
      const minutesArr = ["45"];
      for (const minutes of minutesArr) {
        cron.schedule(
          `${minutes} ${hours} * * *`,
          async () => {
            await this.sync({
              type: ["booster_box", "collector_booster_box", "booster_bundle", "booster_box_18", "elite_trainer_box"],
            });
          },
          {
            timezone: "UTC",
          },
        );
      }
    }
    console.log("📅 Sync scheduler started (runs every hour at 45)", {
      type: ["booster_box", "collector_booster_box", "booster_bundle", "booster_box_18", "elite_trainer_box"],
    });
  }
}
