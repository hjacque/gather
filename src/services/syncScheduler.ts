import { SyncUsecase } from "application/core/sync.usecase";
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
    // 00:00 till 04:00
    cron.schedule(
      "0 0 * * *",
      async () => {
        await this.sync({ type: "single", set: "Alpha" as Set });
      },
      {
        timezone: "UTC",
      },
    );
    cron.schedule(
      "30 0 * * *",
      async () => {
        await this.sync({ type: "single", set: "Beta" as Set });
      },
      {
        timezone: "UTC",
      },
    );
    cron.schedule(
      "0 1 * * *",
      async () => {
        await this.sync({ type: "single", set: "Unlimited" as Set });
      },
      {
        timezone: "UTC",
      },
    );
    cron.schedule(
      "30 1 * * *",
      async () => {
        await this.sync({ type: "single", set: "Arabian Nights" as Set });
      },
      {
        timezone: "UTC",
      },
    );
    cron.schedule(
      "0 2 * * *",
      async () => {
        await this.sync({ type: "single", set: "Antiquities" as Set });
      },
      {
        timezone: "UTC",
      },
    );
    cron.schedule(
      "30 2 * * *",
      async () => {
        await this.sync({ type: "single", set: "Legends" as Set });
      },
      {
        timezone: "UTC",
      },
    );
    cron.schedule(
      "0 3 * * *",
      async () => {
        await this.sync({ type: "single", set: "The Dark" as Set });
      },
      {
        timezone: "UTC",
      },
    );

    // 04:00 till 08:00
    cron.schedule(
      "0 4 * * *",
      async () => {
        await this.sync({ type: "single", set: "Alpha" as Set });
      },
      {
        timezone: "UTC",
      },
    );
    cron.schedule(
      "30 4 * * *",
      async () => {
        await this.sync({ type: "single", set: "Beta" as Set });
      },
      {
        timezone: "UTC",
      },
    );
    cron.schedule(
      "0 5 * * *",
      async () => {
        await this.sync({ type: "single", set: "Unlimited" as Set });
      },
      {
        timezone: "UTC",
      },
    );
    cron.schedule(
      "30 5 * * *",
      async () => {
        await this.sync({ type: "single", set: "Arabian Nights" as Set });
      },
      {
        timezone: "UTC",
      },
    );
    cron.schedule(
      "0 6 * * *",
      async () => {
        await this.sync({ type: "single", set: "Antiquities" as Set });
      },
      {
        timezone: "UTC",
      },
    );
    cron.schedule(
      "30 6 * * *",
      async () => {
        await this.sync({ type: "single", set: "Legends" as Set });
      },
      {
        timezone: "UTC",
      },
    );
    cron.schedule(
      "0 7 * * *",
      async () => {
        await this.sync({ type: "single", set: "The Dark" as Set });
      },
      {
        timezone: "UTC",
      },
    );

    // 08:00 till 12:00
    cron.schedule(
      "0 8 * * *",
      async () => {
        await this.sync({ type: "single", set: "Alpha" as Set });
      },
      {
        timezone: "UTC",
      },
    );
    cron.schedule(
      "30 8 * * *",
      async () => {
        await this.sync({ type: "single", set: "Beta" as Set });
      },
      {
        timezone: "UTC",
      },
    );
    cron.schedule(
      "0 9 * * *",
      async () => {
        await this.sync({ type: "single", set: "Unlimited" as Set });
      },
      {
        timezone: "UTC",
      },
    );
    cron.schedule(
      "30 9 * * *",
      async () => {
        await this.sync({ type: "single", set: "Arabian Nights" as Set });
      },
      {
        timezone: "UTC",
      },
    );
    cron.schedule(
      "0 10 * * *",
      async () => {
        await this.sync({ type: "single", set: "Antiquities" as Set });
      },
      {
        timezone: "UTC",
      },
    );
    cron.schedule(
      "30 10 * * *",
      async () => {
        await this.sync({ type: "single", set: "Legends" as Set });
      },
      {
        timezone: "UTC",
      },
    );
    cron.schedule(
      "0 11 * * *",
      async () => {
        await this.sync({ type: "single", set: "The Dark" as Set });
      },
      {
        timezone: "UTC",
      },
    );

    // 12:00 till 16:00
    cron.schedule(
      "0 12 * * *",
      async () => {
        await this.sync({ type: "single", set: "Alpha" as Set });
      },
      {
        timezone: "UTC",
      },
    );
    cron.schedule(
      "30 12 * * *",
      async () => {
        await this.sync({ type: "single", set: "Beta" as Set });
      },
      {
        timezone: "UTC",
      },
    );
    cron.schedule(
      "0 13 * * *",
      async () => {
        await this.sync({ type: "single", set: "Unlimited" as Set });
      },
      {
        timezone: "UTC",
      },
    );
    cron.schedule(
      "30 13 * * *",
      async () => {
        await this.sync({ type: "single", set: "Arabian Nights" as Set });
      },
      {
        timezone: "UTC",
      },
    );
    cron.schedule(
      "0 14 * * *",
      async () => {
        await this.sync({ type: "single", set: "Antiquities" as Set });
      },
      {
        timezone: "UTC",
      },
    );
    cron.schedule(
      "30 14 * * *",
      async () => {
        await this.sync({ type: "single", set: "Legends" as Set });
      },
      {
        timezone: "UTC",
      },
    );
    cron.schedule(
      "0 15 * * *",
      async () => {
        await this.sync({ type: "single", set: "The Dark" as Set });
      },
      {
        timezone: "UTC",
      },
    );

    // 16:00 till 20:00
    cron.schedule(
      "0 16 * * *",
      async () => {
        await this.sync({ type: "single", set: "Alpha" as Set });
      },
      {
        timezone: "UTC",
      },
    );
    cron.schedule(
      "30 16 * * *",
      async () => {
        await this.sync({ type: "single", set: "Beta" as Set });
      },
      {
        timezone: "UTC",
      },
    );
    cron.schedule(
      "0 17 * * *",
      async () => {
        await this.sync({ type: "single", set: "Unlimited" as Set });
      },
      {
        timezone: "UTC",
      },
    );
    cron.schedule(
      "30 17 * * *",
      async () => {
        await this.sync({ type: "single", set: "Arabian Nights" as Set });
      },
      {
        timezone: "UTC",
      },
    );
    cron.schedule(
      "0 18 * * *",
      async () => {
        await this.sync({ type: "single", set: "Antiquities" as Set });
      },
      {
        timezone: "UTC",
      },
    );
    cron.schedule(
      "30 18 * * *",
      async () => {
        await this.sync({ type: "single", set: "Legends" as Set });
      },
      {
        timezone: "UTC",
      },
    );
    cron.schedule(
      "0 19 * * *",
      async () => {
        await this.sync({ type: "single", set: "The Dark" as Set });
      },
      {
        timezone: "UTC",
      },
    );

    // 20:00 till 00:00
    cron.schedule(
      "0 20 * * *",
      async () => {
        await this.sync({ type: "single", set: "Alpha" as Set });
      },
      {
        timezone: "UTC",
      },
    );
    cron.schedule(
      "30 20 * * *",
      async () => {
        await this.sync({ type: "single", set: "Beta" as Set });
      },
      {
        timezone: "UTC",
      },
    );
    cron.schedule(
      "0 21 * * *",
      async () => {
        await this.sync({ type: "single", set: "Unlimited" as Set });
      },
      {
        timezone: "UTC",
      },
    );
    cron.schedule(
      "30 21 * * *",
      async () => {
        await this.sync({ type: "single", set: "Arabian Nights" as Set });
      },
      {
        timezone: "UTC",
      },
    );
    cron.schedule(
      "0 22 * * *",
      async () => {
        await this.sync({ type: "single", set: "Antiquities" as Set });
      },
      {
        timezone: "UTC",
      },
    );
    cron.schedule(
      "30 22 * * *",
      async () => {
        await this.sync({ type: "single", set: "Legends" as Set });
      },
      {
        timezone: "UTC",
      },
    );
    cron.schedule(
      "0 23 * * *",
      async () => {
        await this.sync({ type: "single", set: "The Dark" as Set });
      },
      {
        timezone: "UTC",
      },
    );
    console.log("📅 Sync scheduler started", { type: "single" });
  }

  async scheduleSealed() {
    cron.schedule(
      "15 0 * * *",
      async () => {
        await this.sync({
          type: ["booster_box", "collector_booster_box", "booster_bundle", "booster_box_18", "elite_trainer_box"],
        });
      },
      {
        timezone: "UTC",
      },
    );
    cron.schedule(
      "45 0 * * *",
      async () => {
        await this.sync({
          type: ["booster_box", "collector_booster_box", "booster_bundle", "booster_box_18", "elite_trainer_box"],
        });
      },
      {
        timezone: "UTC",
      },
    );
    cron.schedule(
      "15 1 * * *",
      async () => {
        await this.sync({
          type: ["booster_box", "collector_booster_box", "booster_bundle", "booster_box_18", "elite_trainer_box"],
        });
      },
      {
        timezone: "UTC",
      },
    );
    cron.schedule(
      "45 1 * * *",
      async () => {
        await this.sync({
          type: ["booster_box", "collector_booster_box", "booster_bundle", "booster_box_18", "elite_trainer_box"],
        });
      },
      {
        timezone: "UTC",
      },
    );
    cron.schedule(
      "15 2 * * *",
      async () => {
        await this.sync({
          type: ["booster_box", "collector_booster_box", "booster_bundle", "booster_box_18", "elite_trainer_box"],
        });
      },
      {
        timezone: "UTC",
      },
    );
    cron.schedule(
      "45 2 * * *",
      async () => {
        await this.sync({
          type: ["booster_box", "collector_booster_box", "booster_bundle", "booster_box_18", "elite_trainer_box"],
        });
      },
      {
        timezone: "UTC",
      },
    );
    cron.schedule(
      "15 3 * * *",
      async () => {
        await this.sync({
          type: ["booster_box", "collector_booster_box", "booster_bundle", "booster_box_18", "elite_trainer_box"],
        });
      },
      {
        timezone: "UTC",
      },
    );
    cron.schedule(
      "45 3 * * *",
      async () => {
        await this.sync({
          type: ["booster_box", "collector_booster_box", "booster_bundle", "booster_box_18", "elite_trainer_box"],
        });
      },
      {
        timezone: "UTC",
      },
    );
    cron.schedule(
      "15 4 * * *",
      async () => {
        await this.sync({
          type: ["booster_box", "collector_booster_box", "booster_bundle", "booster_box_18", "elite_trainer_box"],
        });
      },
      {
        timezone: "UTC",
      },
    );
    cron.schedule(
      "45 4 * * *",
      async () => {
        await this.sync({
          type: ["booster_box", "collector_booster_box", "booster_bundle", "booster_box_18", "elite_trainer_box"],
        });
      },
      {
        timezone: "UTC",
      },
    );
    cron.schedule(
      "15 5 * * *",
      async () => {
        await this.sync({
          type: ["booster_box", "collector_booster_box", "booster_bundle", "booster_box_18", "elite_trainer_box"],
        });
      },
      {
        timezone: "UTC",
      },
    );
    cron.schedule(
      "45 5 * * *",
      async () => {
        await this.sync({
          type: ["booster_box", "collector_booster_box", "booster_bundle", "booster_box_18", "elite_trainer_box"],
        });
      },
      {
        timezone: "UTC",
      },
    );
    cron.schedule(
      "15 6 * * *",
      async () => {
        await this.sync({
          type: ["booster_box", "collector_booster_box", "booster_bundle", "booster_box_18", "elite_trainer_box"],
        });
      },
      {
        timezone: "UTC",
      },
    );
    cron.schedule(
      "45 6 * * *",
      async () => {
        await this.sync({
          type: ["booster_box", "collector_booster_box", "booster_bundle", "booster_box_18", "elite_trainer_box"],
        });
      },
      {
        timezone: "UTC",
      },
    );
    cron.schedule(
      "15 7 * * *",
      async () => {
        await this.sync({
          type: ["booster_box", "collector_booster_box", "booster_bundle", "booster_box_18", "elite_trainer_box"],
        });
      },
      {
        timezone: "UTC",
      },
    );
    cron.schedule(
      "45 7 * * *",
      async () => {
        await this.sync({
          type: ["booster_box", "collector_booster_box", "booster_bundle", "booster_box_18", "elite_trainer_box"],
        });
      },
      {
        timezone: "UTC",
      },
    );
    cron.schedule(
      "15 8 * * *",
      async () => {
        await this.sync({
          type: ["booster_box", "collector_booster_box", "booster_bundle", "booster_box_18", "elite_trainer_box"],
        });
      },
      {
        timezone: "UTC",
      },
    );
    cron.schedule(
      "45 8 * * *",
      async () => {
        await this.sync({
          type: ["booster_box", "collector_booster_box", "booster_bundle", "booster_box_18", "elite_trainer_box"],
        });
      },
      {
        timezone: "UTC",
      },
    );
    cron.schedule(
      "15 9 * * *",
      async () => {
        await this.sync({
          type: ["booster_box", "collector_booster_box", "booster_bundle", "booster_box_18", "elite_trainer_box"],
        });
      },
      {
        timezone: "UTC",
      },
    );
    cron.schedule(
      "45 9 * * *",
      async () => {
        await this.sync({
          type: ["booster_box", "collector_booster_box", "booster_bundle", "booster_box_18", "elite_trainer_box"],
        });
      },
      {
        timezone: "UTC",
      },
    );
    cron.schedule(
      "15 10 * * *",
      async () => {
        await this.sync({
          type: ["booster_box", "collector_booster_box", "booster_bundle", "booster_box_18", "elite_trainer_box"],
        });
      },
      {
        timezone: "UTC",
      },
    );
    cron.schedule(
      "45 10 * * *",
      async () => {
        await this.sync({
          type: ["booster_box", "collector_booster_box", "booster_bundle", "booster_box_18", "elite_trainer_box"],
        });
      },
      {
        timezone: "UTC",
      },
    );
    cron.schedule(
      "15 11 * * *",
      async () => {
        await this.sync({
          type: ["booster_box", "collector_booster_box", "booster_bundle", "booster_box_18", "elite_trainer_box"],
        });
      },
      {
        timezone: "UTC",
      },
    );
    cron.schedule(
      "45 11 * * *",
      async () => {
        await this.sync({
          type: ["booster_box", "collector_booster_box", "booster_bundle", "booster_box_18", "elite_trainer_box"],
        });
      },
      {
        timezone: "UTC",
      },
    );
    cron.schedule(
      "15 12 * * *",
      async () => {
        await this.sync({
          type: ["booster_box", "collector_booster_box", "booster_bundle", "booster_box_18", "elite_trainer_box"],
        });
      },
      {
        timezone: "UTC",
      },
    );
    cron.schedule(
      "45 12 * * *",
      async () => {
        await this.sync({
          type: ["booster_box", "collector_booster_box", "booster_bundle", "booster_box_18", "elite_trainer_box"],
        });
      },
      {
        timezone: "UTC",
      },
    );
    cron.schedule(
      "15 13 * * *",
      async () => {
        await this.sync({
          type: ["booster_box", "collector_booster_box", "booster_bundle", "booster_box_18", "elite_trainer_box"],
        });
      },
      {
        timezone: "UTC",
      },
    );
    cron.schedule(
      "45 13 * * *",
      async () => {
        await this.sync({
          type: ["booster_box", "collector_booster_box", "booster_bundle", "booster_box_18", "elite_trainer_box"],
        });
      },
      {
        timezone: "UTC",
      },
    );
    cron.schedule(
      "15 14 * * *",
      async () => {
        await this.sync({
          type: ["booster_box", "collector_booster_box", "booster_bundle", "booster_box_18", "elite_trainer_box"],
        });
      },
      {
        timezone: "UTC",
      },
    );
    cron.schedule(
      "45 14 * * *",
      async () => {
        await this.sync({
          type: ["booster_box", "collector_booster_box", "booster_bundle", "booster_box_18", "elite_trainer_box"],
        });
      },
      {
        timezone: "UTC",
      },
    );
    cron.schedule(
      "15 15 * * *",
      async () => {
        await this.sync({
          type: ["booster_box", "collector_booster_box", "booster_bundle", "booster_box_18", "elite_trainer_box"],
        });
      },
      {
        timezone: "UTC",
      },
    );
    cron.schedule(
      "45 15 * * *",
      async () => {
        await this.sync({
          type: ["booster_box", "collector_booster_box", "booster_bundle", "booster_box_18", "elite_trainer_box"],
        });
      },
      {
        timezone: "UTC",
      },
    );
    cron.schedule(
      "15 16 * * *",
      async () => {
        await this.sync({
          type: ["booster_box", "collector_booster_box", "booster_bundle", "booster_box_18", "elite_trainer_box"],
        });
      },
      {
        timezone: "UTC",
      },
    );
    cron.schedule(
      "45 16 * * *",
      async () => {
        await this.sync({
          type: ["booster_box", "collector_booster_box", "booster_bundle", "booster_box_18", "elite_trainer_box"],
        });
      },
      {
        timezone: "UTC",
      },
    );
    cron.schedule(
      "15 17 * * *",
      async () => {
        await this.sync({
          type: ["booster_box", "collector_booster_box", "booster_bundle", "booster_box_18", "elite_trainer_box"],
        });
      },
      {
        timezone: "UTC",
      },
    );
    cron.schedule(
      "45 17 * * *",
      async () => {
        await this.sync({
          type: ["booster_box", "collector_booster_box", "booster_bundle", "booster_box_18", "elite_trainer_box"],
        });
      },
      {
        timezone: "UTC",
      },
    );
    cron.schedule(
      "15 18 * * *",
      async () => {
        await this.sync({
          type: ["booster_box", "collector_booster_box", "booster_bundle", "booster_box_18", "elite_trainer_box"],
        });
      },
      {
        timezone: "UTC",
      },
    );
    cron.schedule(
      "45 18 * * *",
      async () => {
        await this.sync({
          type: ["booster_box", "collector_booster_box", "booster_bundle", "booster_box_18", "elite_trainer_box"],
        });
      },
      {
        timezone: "UTC",
      },
    );
    cron.schedule(
      "15 19 * * *",
      async () => {
        await this.sync({
          type: ["booster_box", "collector_booster_box", "booster_bundle", "booster_box_18", "elite_trainer_box"],
        });
      },
      {
        timezone: "UTC",
      },
    );
    cron.schedule(
      "45 19 * * *",
      async () => {
        await this.sync({
          type: ["booster_box", "collector_booster_box", "booster_bundle", "booster_box_18", "elite_trainer_box"],
        });
      },
      {
        timezone: "UTC",
      },
    );
    cron.schedule(
      "15 20 * * *",
      async () => {
        await this.sync({
          type: ["booster_box", "collector_booster_box", "booster_bundle", "booster_box_18", "elite_trainer_box"],
        });
      },
      {
        timezone: "UTC",
      },
    );
    cron.schedule(
      "45 20 * * *",
      async () => {
        await this.sync({
          type: ["booster_box", "collector_booster_box", "booster_bundle", "booster_box_18", "elite_trainer_box"],
        });
      },
      {
        timezone: "UTC",
      },
    );
    cron.schedule(
      "15 21 * * *",
      async () => {
        await this.sync({
          type: ["booster_box", "collector_booster_box", "booster_bundle", "booster_box_18", "elite_trainer_box"],
        });
      },
      {
        timezone: "UTC",
      },
    );
    cron.schedule(
      "45 21 * * *",
      async () => {
        await this.sync({
          type: ["booster_box", "collector_booster_box", "booster_bundle", "booster_box_18", "elite_trainer_box"],
        });
      },
      {
        timezone: "UTC",
      },
    );
    cron.schedule(
      "15 22 * * *",
      async () => {
        await this.sync({
          type: ["booster_box", "collector_booster_box", "booster_bundle", "booster_box_18", "elite_trainer_box"],
        });
      },
      {
        timezone: "UTC",
      },
    );
    cron.schedule(
      "45 22 * * *",
      async () => {
        await this.sync({
          type: ["booster_box", "collector_booster_box", "booster_bundle", "booster_box_18", "elite_trainer_box"],
        });
      },
      {
        timezone: "UTC",
      },
    );
    cron.schedule(
      "15 23 * * *",
      async () => {
        await this.sync({
          type: ["booster_box", "collector_booster_box", "booster_bundle", "booster_box_18", "elite_trainer_box"],
        });
      },
      {
        timezone: "UTC",
      },
    );
    cron.schedule(
      "45 23 * * *",
      async () => {
        await this.sync({
          type: ["booster_box", "collector_booster_box", "booster_bundle", "booster_box_18", "elite_trainer_box"],
        });
      },
      {
        timezone: "UTC",
      },
    );
    console.log("📅 Sync scheduler started (runs every 15 minutes)", {
      type: ["booster_box", "collector_booster_box", "booster_bundle", "booster_box_18", "elite_trainer_box"],
    });
  }
}
