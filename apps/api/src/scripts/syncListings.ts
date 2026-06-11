/**
 * Backfill / refresh eBay active listings (the buy side of the opportunities
 * funnel) for every Card with an ebayLink, in one browser session. Each Card's
 * stored Listings are fully replaced, so re-running prunes stale asks.
 *
 * Usage:
 *   tsx src/scripts/syncListings.ts [--set=CODE] [--tags=a,b]
 */

import { initRepository } from "../repository/init.repository";
import { SyncListingsUsecase } from "../application/sync/syncListings.usecase";
import { EbayListingsSource } from "../application/sync/sources/ebayListings.source";

const arg = (name: string): string | undefined =>
  process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];

async function main() {
  const set = arg("set");
  const tags = arg("tags")?.split(",");

  const { repositories, close } = await initRepository();
  try {
    const usecase = new SyncListingsUsecase(
      repositories.cardRepository,
      repositories.listingRepository,
      new EbayListingsSource()
    );
    const result = await usecase.executeBatch({
      ...(set ? { set } : {}),
      ...(tags ? { tags } : {}),
    });
    console.log("\nListings Sync done:", result);
  } finally {
    await close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
