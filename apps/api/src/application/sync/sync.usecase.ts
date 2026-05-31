import { connect } from "puppeteer-real-browser";
import { ProductEntity, Set } from "../../entities/product.entity";
import { ProductRepositoryPort } from "../../repository/ports/product.repository.port";
import { DEFAULT_USD_TO_EUR } from "../../constants";
import { PriceRepositoryPort } from "../../repository/ports/price.repository.port";
import { PriceSourcePort } from "./sources/priceSource.port";
import { getEurToUsdRate } from "./helper";
import { syncProduct } from "./syncProduct";

export type SyncUsecaseInputDto = {
  filter: {
    set?: Set;
    tags?: string | string[];
  };
  mode: {
    headless: boolean;
  };
};

export class SyncUsecase {
  constructor(
    private readonly productRepository: ProductRepositoryPort,
    private readonly priceRepository: PriceRepositoryPort,
    private readonly priceSources: PriceSourcePort[]
  ) {}

  async execute({ filter, mode }: SyncUsecaseInputDto) {
    console.log("start");

    const usdToEur = await getEurToUsdRate();

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
      const products = await this.productRepository.getProducts(filter, {
        take,
        page: paginationPage,
      });
      if (!products?.length) {
        console.log("No products found");
        paginationPage = 1;
        break;
      }
      paginationPage++;

      for (const product of products) {
        await syncProduct(
          product,
          today,
          page,
          usdToEur,
          this.priceSources,
          this.priceRepository
        );
        await new Promise((resolve) =>
          setTimeout(resolve, 4000 + Math.random() * 4000)
        );
      }
    }

    await page.close();
    await browser.close();

    console.log("end");
  }
}
