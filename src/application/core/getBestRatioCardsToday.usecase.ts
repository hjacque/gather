import { PriceRepositoryPort } from "../../repository/ports/price.repository.port";

export class GetBestRatioCardsTodayUsecase {
  constructor(private readonly priceRepository: PriceRepositoryPort) {}

  async execute() {
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setUTCHours(23, 59, 59, 999);

    const result = await this.priceRepository.getBestRatioCards(
      startOfDay,
      endOfDay
    );
    // if (!result) {
    //   return [];
    // }

    const formated = result.map((e) => {
      return {
        ratio: e.value - 100,
        name: e.productDetails.name,
        set: e.productDetails.set,
        link: e.productDetails.cardMarketLink,
        market: e.marketPrice,
        cardMarket: e.cardMarketPrice,
        buylist: e.buylistPrice,
        estimated: e.estimatedPrice,
        fairPriceOnCardmarket: e.fairPriceOnCardmarket,
      };
    });

    console.log("GetBestRatioCardsTodayUsecase", formated);

    return formated;
  }
}
