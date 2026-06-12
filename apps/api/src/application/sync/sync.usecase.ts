import { connect } from "puppeteer-real-browser";
import { CardEntity, Set } from "../../entities/card.entity";
import { CardRepositoryPort } from "../../repository/ports/card.repository.port";
import { DEFAULT_USD_TO_EUR } from "../../constants";
import { ListingRepositoryPort } from "../../repository/ports/listing.repository.port";
import { PriceSourcePort } from "./sources/priceSource.port";
import { getEurToUsdRate } from "./helper";
import { syncCard } from "./syncCard";
import { SyncSalesUsecase, SaleSyncCounters } from "./syncSales.usecase";
import { SyncListingsUsecase, ListingSyncCounters } from "./syncListings.usecase";

export type SyncUsecaseInputDto = {
  filter: {
    set?: Set;
    tags?: string | string[];
  };
  mode: {
    headless: boolean;
  };
  skipSales?: boolean;
};

export class SyncUsecase {
  constructor(
    private readonly cardRepository: CardRepositoryPort,
    private readonly priceSources: PriceSourcePort[],
    private readonly syncSalesUsecase: SyncSalesUsecase,
    private readonly syncListingsUsecase: SyncListingsUsecase,
    private readonly listingRepository: ListingRepositoryPort
  ) {}

  async execute({ filter, mode, skipSales = false }: SyncUsecaseInputDto) {
    console.log("start");

    const usdToEur = await getEurToUsdRate();
    const saleCounters: SaleSyncCounters = {
      scraped: 0,
      withinWindow: 0,
      upserted: 0,
      skipped: 0,
      autoValidated: 0,
      autoInvalidated: 0,
      reverified: 0,
      confirmed: 0,
      invalidated: 0,
    };
    const listingCounters: ListingSyncCounters = {
      scraped: 0,
      stored: 0,
      skippedTitle: 0,
      skippedSeller: 0,
    };

    let paginationPage = 1;
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const { browser, page } = await connect({
      headless: false,
      disableXvfb: !mode.headless,
      args: [],
      customConfig: {},
      turnstile: true,
      connectOption: { defaultViewport: null },
      ignoreAllFlags: false,
      plugins: [require("puppeteer-extra-plugin-stealth")()],
    });
    await page.setViewport({
      width: Math.floor(1024 + Math.random() * 100),
      height: Math.floor(768 + Math.random() * 100),
    });

    while (true) {
      const take = 4;
      const cards = await this.cardRepository.getCards(filter, {
        take,
        page: paginationPage,
      });
      if (!cards?.length) {
        console.log("No cards found");
        paginationPage = 1;
        break;
      }
      paginationPage++;

      for (const card of cards) {
        await syncCard(
          card,
          today,
          page,
          usdToEur,
          this.priceSources,
          this.listingRepository
        );
        if (!skipSales) {
          // Fold the eBay Sale Sync into the same browser session — scrape +
          // re-verify this Card's Sales right after its prices. No-ops for Cards
          // without an ebayLink.
          await this.syncSalesUsecase.syncCardOnPage(card, page, saleCounters);
          // Likewise the Listings Sync: refresh this Card's live Buy-It-Now
          // asks (the eBay buy side of the opportunities funnel).
          await this.syncListingsUsecase.syncCardOnPage(card, page, listingCounters);
        }
        await new Promise((resolve) =>
          setTimeout(resolve, 4000 + Math.random() * 4000)
        );
      }
    }

    await page.close();
    await browser.close();

    console.log("end", { sales: saleCounters, listings: listingCounters });
  }
}
