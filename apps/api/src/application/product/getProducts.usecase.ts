import { ProductRepositoryPort } from "../../repository/ports/product.repository.port";
import { PriceRepositoryPort } from "../../repository/ports/price.repository.port";
import { PsaPopReportRepositoryPort } from "../../repository/ports/psaPopReport.repository.port";
import { CollectionRepositoryPort } from "../../repository/ports/collection.repository.port";
import { Region } from "@gather/types";
import type { GetProductsResponse } from "@gather/api-contract";

export class GetProductsUsecase {
  constructor(
    private readonly productRepository: ProductRepositoryPort,
    private readonly priceRepository: PriceRepositoryPort,
    private readonly psaPopReportRepository: PsaPopReportRepositoryPort,
    private readonly collectionRepository: CollectionRepositoryPort
  ) {}

  async execute(filter?: {
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

    const [prices, yesterdayPrices, psaReports, collectionEntries] = await Promise.all([
      this.priceRepository.getProductsPricesByDate(productIds, today),
      this.priceRepository.getProductsPricesByDate(productIds, yesterday),
      this.psaPopReportRepository.findByProductIds(productIds),
      this.collectionRepository.findByProductIds(productIds),
    ]);

    return products.map((product) => {
      const {
        cardmarketPsa9,
        cardmarketPsa10,
      } = prices.get(product.id)!;
      const yp = yesterdayPrices.get(product.id)!;
      const psaReport = psaReports.get(product.id) ?? null;
      const psaTotal = psaReport?.total ?? null;
      const psaGrade10Pop = psaReport?.grade10 ?? null;
      const collectionEntry = collectionEntries.get(product.id) ?? null;

      return {
        ...product,
        cardmarketPsa9,
        cardmarketPsa10,
        cardmarketPsa9Yesterday: yp.cardmarketPsa9,
        cardmarketPsa10Yesterday: yp.cardmarketPsa10,
        psaTotal,
        psaGrade10Pop,
        collectionEntry,
      };
    });
  }
}
