import { ProductRepositoryPort } from "../../repository/ports/product.repository.port";
import { PerformanceRepositoryPort } from "../../repository/ports/performance.repository.port";
import { PriceRepositoryPort } from "../../repository/ports/price.repository.port";
import { PsaPopReportRepositoryPort } from "../../repository/ports/psaPopReport.repository.port";
import { Franchise, ProductType } from "entities/product.entity";
import { Region } from "@gather/types";
import type { GetProductsResponse } from "@gather/api-contract";

export class GetProductsUsecase {
  constructor(
    private readonly productRepository: ProductRepositoryPort,
    private readonly priceRepository: PriceRepositoryPort,
    private readonly performanceRepository: PerformanceRepositoryPort,
    private readonly psaPopReportRepository: PsaPopReportRepositoryPort
  ) {}

  async execute(filter?: {
    franchise?: Franchise;
    type?: ProductType | ProductType[];
    tags?: string | string[];
    set?: string;
    region?: Region | Region[];
  }): Promise<GetProductsResponse> {
    const products = await this.productRepository.getProducts(filter);
    const productIds = products.map((product) => product.id);

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);

    const [prices, yesterdayPrices, performances, psaReports] = await Promise.all([
      this.priceRepository.getProductsPricesByDate(productIds, today),
      this.priceRepository.getProductsPricesByDate(productIds, yesterday),
      this.performanceRepository.getPerformances(productIds, today),
      this.psaPopReportRepository.findByProductIds(productIds),
    ]);

    return products.map((product) => {
      const {
        market,
        buylist,
        ratio,
        perBooster,
        cardmarketListingCount,
        fullSet,
        tcgp,
        bricklinkAverage,
        cardmarketPsa9,
        cardmarketPsa10,
      } = prices.get(product.id)!;
      const yp = yesterdayPrices.get(product.id)!;
      const performance = performances.get(product.id)!;
      const psaReport = psaReports.get(product.id) ?? null;
      const psaTotal = psaReport?.total ?? null;

      return {
        ...product,
        market,
        buylist,
        ratio,
        perBooster,
        cardmarketListingCount,
        performance,
        fullSet,
        tcgp,
        bricklinkAverage,
        cardmarketPsa9,
        cardmarketPsa10,
        cardmarketPsa9Yesterday: yp.cardmarketPsa9,
        cardmarketPsa10Yesterday: yp.cardmarketPsa10,
        psaTotal,
      };
    });
  }
}
