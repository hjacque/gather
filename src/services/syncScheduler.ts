import { SyncUsecase } from 'application/core/sync.usecase';
import { Franchise, ProductType, Set } from '../entities/product.entity';
import cron from 'node-cron';


export class SyncSchedulerService {
    constructor(
        private readonly syncUsecase: SyncUsecase,
    ) {}

    async execute() {
        
        await this.scheduleSingles();
        await this.scheduleSealed();
        
        // Run immediately on startup (for testing)
        // setTimeout(async () => {
        //     await this.sync({type: ["booster_box", "collector_booster_box", "booster_bundle"]});
        // }, 5000);        
    }

    async sync(filter: {
            set?: Set;
            franchise?: Franchise,
            type?: ProductType | ProductType[]
        } = {}) {
        try {
            console.log('🔄 Starting price update job...');
            
            await this.syncUsecase.execute({ mode: { headless: true }, filter},);
            
            console.log(`✅ Updated prices`);
        } catch (error) {
            console.error('❌ Error updating product prices:', error);
        }      
    }

    async scheduleSingles() {
        // 00:00 till 04:00
        cron.schedule('0 0 * * *', async () => {
            await this.sync({type: "single", set: "alpha" as Set});
        }, {
            timezone: "UTC"
        });
        cron.schedule('30 0 * * *', async () => {
            await this.sync({type: "single", set: "beta" as Set});
        }, {
            timezone: "UTC"
        });
        cron.schedule('0 1 * * *', async () => {
            await this.sync({type: "single", set: "unlimited" as Set});
        }, {
            timezone: "UTC"
        });
        cron.schedule('30 1 * * *', async () => {
            await this.sync({type: "single", set: "arabian_nights" as Set});
        }, {
            timezone: "UTC"
        });
        cron.schedule('0 2 * * *', async () => {
            await this.sync({type: "single", set: "antiquities" as Set});
        }, {
            timezone: "UTC"
        });
        cron.schedule('30 2 * * *', async () => {
            await this.sync({type: "single", set: "legends" as Set});
        }, {
            timezone: "UTC"
        });
        cron.schedule('0 3 * * *', async () => {
            await this.sync({type: "single", set: "the_dark" as Set});
        }, {
            timezone: "UTC"
        });

        // 04:00 till 08:00
        cron.schedule('0 4 * * *', async () => {
            await this.sync({type: "single", set: "alpha" as Set});
        }, {
            timezone: "UTC"
        });
        cron.schedule('30 4 * * *', async () => {
            await this.sync({type: "single", set: "beta" as Set});
        }, {
            timezone: "UTC"
        });
        cron.schedule('0 5 * * *', async () => {
            await this.sync({type: "single", set: "unlimited" as Set});
        }, {
            timezone: "UTC"
        });
        cron.schedule('30 5 * * *', async () => {
            await this.sync({type: "single", set: "arabian_nights" as Set});
        }, {
            timezone: "UTC"
        });
        cron.schedule('0 6 * * *', async () => {
            await this.sync({type: "single", set: "antiquities" as Set});
        }, {
            timezone: "UTC"
        });
        cron.schedule('30 6 * * *', async () => {
            await this.sync({type: "single", set: "legends" as Set});
        }, {
            timezone: "UTC"
        });
        cron.schedule('0 7 * * *', async () => {
            await this.sync({type: "single", set: "the_dark" as Set});
        }, {
            timezone: "UTC"
        });
        
        // 08:00 till 12:00
        cron.schedule('0 8 * * *', async () => {
            await this.sync({type: "single", set: "alpha" as Set});
        }, {
            timezone: "UTC"
        });
        cron.schedule('30 8 * * *', async () => {
            await this.sync({type: "single", set: "beta" as Set});
        }, {
            timezone: "UTC"
        });
        cron.schedule('0 9 * * *', async () => {
            await this.sync({type: "single", set: "unlimited" as Set});
        }, {
            timezone: "UTC"
        });
        cron.schedule('30 9 * * *', async () => {
            await this.sync({type: "single", set: "arabian_nights" as Set});
        }, {
            timezone: "UTC"
        });
        cron.schedule('0 10 * * *', async () => {
            await this.sync({type: "single", set: "antiquities" as Set});
        }, {
            timezone: "UTC"
        });
        cron.schedule('30 10 * * *', async () => {
            await this.sync({type: "single", set: "legends" as Set});
        }, {
            timezone: "UTC"
        });
        cron.schedule('0 11 * * *', async () => {
            await this.sync({type: "single", set: "the_dark" as Set});
        }, {
            timezone: "UTC"
        });

        // 12:00 till 16:00
        cron.schedule('0 12 * * *', async () => {
            await this.sync({type: "single", set: "alpha" as Set});
        }, {
            timezone: "UTC"
        });
        cron.schedule('30 12 * * *', async () => {
            await this.sync({type: "single", set: "beta" as Set});
        }, {
            timezone: "UTC"
        });
        cron.schedule('0 13 * * *', async () => {
            await this.sync({type: "single", set: "unlimited" as Set});
        }, {
            timezone: "UTC"
        });
        cron.schedule('30 13 * * *', async () => {
            await this.sync({type: "single", set: "arabian_nights" as Set});
        }, {
            timezone: "UTC"
        });
        cron.schedule('0 14 * * *', async () => {
            await this.sync({type: "single", set: "antiquities" as Set});
        }, {
            timezone: "UTC"
        });
        cron.schedule('30 14 * * *', async () => {
            await this.sync({type: "single", set: "legends" as Set});
        }, {
            timezone: "UTC"
        });
        cron.schedule('0 15 * * *', async () => {
            await this.sync({type: "single", set: "the_dark" as Set});
        }, {
            timezone: "UTC"
        });
        
        // 16:00 till 20:00
        cron.schedule('0 16 * * *', async () => {
            await this.sync({type: "single", set: "alpha" as Set});
        }, {
            timezone: "UTC"
        });
        cron.schedule('30 16 * * *', async () => {
            await this.sync({type: "single", set: "beta" as Set});
        }, {
            timezone: "UTC"
        });
        cron.schedule('0 17 * * *', async () => {
            await this.sync({type: "single", set: "unlimited" as Set});
        }, {
            timezone: "UTC"
        });
        cron.schedule('30 17 * * *', async () => {
            await this.sync({type: "single", set: "arabian_nights" as Set});
        }, {
            timezone: "UTC"
        });
        cron.schedule('0 18 * * *', async () => {
            await this.sync({type: "single", set: "antiquities" as Set});
        }, {
            timezone: "UTC"
        });
        cron.schedule('30 18 * * *', async () => {
            await this.sync({type: "single", set: "legends" as Set});
        }, {
            timezone: "UTC"
        });
        cron.schedule('0 19 * * *', async () => {
            await this.sync({type: "single", set: "the_dark" as Set});
        }, {
            timezone: "UTC"
        });

        // 20:00 till 00:00
        cron.schedule('0 20 * * *', async () => {
            await this.sync({type: "single", set: "alpha" as Set});
        }, {
            timezone: "UTC"
        });
        cron.schedule('30 20 * * *', async () => {
            await this.sync({type: "single", set: "beta" as Set});
        }, {
            timezone: "UTC"
        });
        cron.schedule('0 21 * * *', async () => {
            await this.sync({type: "single", set: "unlimited" as Set});
        }, {
            timezone: "UTC"
        });
        cron.schedule('30 21 * * *', async () => {
            await this.sync({type: "single", set: "arabian_nights" as Set});
        }, {
            timezone: "UTC"
        });
        cron.schedule('0 22 * * *', async () => {
            await this.sync({type: "single", set: "antiquities" as Set});
        }, {
            timezone: "UTC"
        });
        cron.schedule('30 22 * * *', async () => {
            await this.sync({type: "single", set: "legends" as Set});
        }, {
            timezone: "UTC"
        });
        cron.schedule('0 23 * * *', async () => {
            await this.sync({type: "single", set: "the_dark" as Set});
        }, {
            timezone: "UTC"
        });
        console.log('📅 Sync scheduler started', {type: "single"});
    }

    async scheduleSealed() {
        cron.schedule('25 0 * * *', async () => {
            await this.sync({type: ["booster_box", "collector_booster_box", "booster_bundle"]});
        }, {
            timezone: "UTC"
        });
        cron.schedule('55 0 * * *', async () => {
            await this.sync({type: ["booster_box", "collector_booster_box", "booster_bundle"]});
        }, {
            timezone: "UTC"
        });
                cron.schedule('25 1 * * *', async () => {
            await this.sync({type: ["booster_box", "collector_booster_box", "booster_bundle"]});
        }, {
            timezone: "UTC"
        });
        cron.schedule('55 1 * * *', async () => {
            await this.sync({type: ["booster_box", "collector_booster_box", "booster_bundle"]});
        }, {
            timezone: "UTC"
        });
                cron.schedule('25 2 * * *', async () => {
            await this.sync({type: ["booster_box", "collector_booster_box", "booster_bundle"]});
        }, {
            timezone: "UTC"
        });
        cron.schedule('55 2 * * *', async () => {
            await this.sync({type: ["booster_box", "collector_booster_box", "booster_bundle"]});
        }, {
            timezone: "UTC"
        });
                cron.schedule('25 3 * * *', async () => {
            await this.sync({type: ["booster_box", "collector_booster_box", "booster_bundle"]});
        }, {
            timezone: "UTC"
        });
        cron.schedule('55 3 * * *', async () => {
            await this.sync({type: ["booster_box", "collector_booster_box", "booster_bundle"]});
        }, {
            timezone: "UTC"
        });
                cron.schedule('25 4 * * *', async () => {
            await this.sync({type: ["booster_box", "collector_booster_box", "booster_bundle"]});
        }, {
            timezone: "UTC"
        });
        cron.schedule('55 4 * * *', async () => {
            await this.sync({type: ["booster_box", "collector_booster_box", "booster_bundle"]});
        }, {
            timezone: "UTC"
        });
        cron.schedule('25 5 * * *', async () => {
            await this.sync({type: ["booster_box", "collector_booster_box", "booster_bundle"]});
        }, {
            timezone: "UTC"
        });
        cron.schedule('55 5 * * *', async () => {
            await this.sync({type: ["booster_box", "collector_booster_box", "booster_bundle"]});
        }, {
            timezone: "UTC"
        });
        cron.schedule('25 6 * * *', async () => {
            await this.sync({type: ["booster_box", "collector_booster_box", "booster_bundle"]});
        }, {
            timezone: "UTC"
        });
        cron.schedule('55 6 * * *', async () => {
            await this.sync({type: ["booster_box", "collector_booster_box", "booster_bundle"]});
        }, {
            timezone: "UTC"
        });
        cron.schedule('25 7 * * *', async () => {
            await this.sync({type: ["booster_box", "collector_booster_box", "booster_bundle"]});
        }, {
            timezone: "UTC"
        });
        cron.schedule('55 7 * * *', async () => {
            await this.sync({type: ["booster_box", "collector_booster_box", "booster_bundle"]});
        }, {
            timezone: "UTC"
        });
        cron.schedule('25 8 * * *', async () => {
            await this.sync({type: ["booster_box", "collector_booster_box", "booster_bundle"]});
        }, {
            timezone: "UTC"
        });
        cron.schedule('55 8 * * *', async () => {
            await this.sync({type: ["booster_box", "collector_booster_box", "booster_bundle"]});
        }, {
            timezone: "UTC"
        });
        cron.schedule('25 9 * * *', async () => {
            await this.sync({type: ["booster_box", "collector_booster_box", "booster_bundle"]});
        }, {
            timezone: "UTC"
        });
        cron.schedule('55 9 * * *', async () => {
            await this.sync({type: ["booster_box", "collector_booster_box", "booster_bundle"]});
        }, {
            timezone: "UTC"
        });
        cron.schedule('25 10 * * *', async () => {
            await this.sync({type: ["booster_box", "collector_booster_box", "booster_bundle"]});
        }, {
            timezone: "UTC"
        });
        cron.schedule('55 10 * * *', async () => {
            await this.sync({type: ["booster_box", "collector_booster_box", "booster_bundle"]});
        }, {
            timezone: "UTC"
        });
        cron.schedule('25 11 * * *', async () => {
            await this.sync({type: ["booster_box", "collector_booster_box", "booster_bundle"]});
        }, {
            timezone: "UTC"
        });
        cron.schedule('55 11 * * *', async () => {
            await this.sync({type: ["booster_box", "collector_booster_box", "booster_bundle"]});
        }, {
            timezone: "UTC"
        });
        cron.schedule('25 12 * * *', async () => {
            await this.sync({type: ["booster_box", "collector_booster_box", "booster_bundle"]});
        }, {
            timezone: "UTC"
        });
        cron.schedule('55 12 * * *', async () => {
            await this.sync({type: ["booster_box", "collector_booster_box", "booster_bundle"]});
        }, {
            timezone: "UTC"
        });
        cron.schedule('25 13 * * *', async () => {
            await this.sync({type: ["booster_box", "collector_booster_box", "booster_bundle"]});
        }, {
            timezone: "UTC"
        });
        cron.schedule('55 13 * * *', async () => {
            await this.sync({type: ["booster_box", "collector_booster_box", "booster_bundle"]});
        }, {
            timezone: "UTC"
        });
        cron.schedule('25 14 * * *', async () => {
            await this.sync({type: ["booster_box", "collector_booster_box", "booster_bundle"]});
        }, {
            timezone: "UTC"
        });
        cron.schedule('55 14 * * *', async () => {
            await this.sync({type: ["booster_box", "collector_booster_box", "booster_bundle"]});
        }, {
            timezone: "UTC"
        });
        cron.schedule('25 15 * * *', async () => {
            await this.sync({type: ["booster_box", "collector_booster_box", "booster_bundle"]});
        }, {
            timezone: "UTC"
        });
        cron.schedule('55 15 * * *', async () => {
            await this.sync({type: ["booster_box", "collector_booster_box", "booster_bundle"]});
        }, {
            timezone: "UTC"
        });
        cron.schedule('25 16 * * *', async () => {
            await this.sync({type: ["booster_box", "collector_booster_box", "booster_bundle"]});
        }, {
            timezone: "UTC"
        });
        cron.schedule('55 16 * * *', async () => {
            await this.sync({type: ["booster_box", "collector_booster_box", "booster_bundle"]});
        }, {
            timezone: "UTC"
        });
        cron.schedule('25 17 * * *', async () => {
            await this.sync({type: ["booster_box", "collector_booster_box", "booster_bundle"]});
        }, {
            timezone: "UTC"
        });
        cron.schedule('55 17 * * *', async () => {
            await this.sync({type: ["booster_box", "collector_booster_box", "booster_bundle"]});
        }, {
            timezone: "UTC"
        });
        cron.schedule('25 18 * * *', async () => {
            await this.sync({type: ["booster_box", "collector_booster_box", "booster_bundle"]});
        }, {
            timezone: "UTC"
        });
        cron.schedule('55 18 * * *', async () => {
            await this.sync({type: ["booster_box", "collector_booster_box", "booster_bundle"]});
        }, {
            timezone: "UTC"
        });
        cron.schedule('25 19 * * *', async () => {
            await this.sync({type: ["booster_box", "collector_booster_box", "booster_bundle"]});
        }, {
            timezone: "UTC"
        });
        cron.schedule('55 19 * * *', async () => {
            await this.sync({type: ["booster_box", "collector_booster_box", "booster_bundle"]});
        }, {
            timezone: "UTC"
        });
        cron.schedule('25 20 * * *', async () => {
            await this.sync({type: ["booster_box", "collector_booster_box", "booster_bundle"]});
        }, {
            timezone: "UTC"
        });
        cron.schedule('55 20 * * *', async () => {
            await this.sync({type: ["booster_box", "collector_booster_box", "booster_bundle"]});
        }, {
            timezone: "UTC"
        });
        cron.schedule('25 21 * * *', async () => {
            await this.sync({type: ["booster_box", "collector_booster_box", "booster_bundle"]});
        }, {
            timezone: "UTC"
        });
        cron.schedule('55 21 * * *', async () => {
            await this.sync({type: ["booster_box", "collector_booster_box", "booster_bundle"]});
        }, {
            timezone: "UTC"
        });
        cron.schedule('25 22 * * *', async () => {
            await this.sync({type: ["booster_box", "collector_booster_box", "booster_bundle"]});
        }, {
            timezone: "UTC"
        });
        cron.schedule('55 22 * * *', async () => {
            await this.sync({type: ["booster_box", "collector_booster_box", "booster_bundle"]});
        }, {
            timezone: "UTC"
        });
        cron.schedule('25 23 * * *', async () => {
            await this.sync({type: ["booster_box", "collector_booster_box", "booster_bundle"]});
        }, {
            timezone: "UTC"
        });
        cron.schedule('55 23 * * *', async () => {
            await this.sync({type: ["booster_box", "collector_booster_box", "booster_bundle"]});
        }, {
            timezone: "UTC"
        });
        console.log('📅 Sync scheduler started (runs every 15 minutes)', {type: ["booster_box", "collector_booster_box", "booster_bundle"]});
    }
}