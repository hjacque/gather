import { initRepository } from "../repository/init.repository";
import { SyncListingsUsecase } from "../application/sync/syncListings.usecase";
import { EbayListingsSource } from "../application/sync/sources/ebayListings.source";
import { EbayItemPageSource } from "../application/sync/sources/ebayItemPage.source";

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
      new EbayListingsSource(),
      new EbayItemPageSource()
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
