import { ProductEntity } from "../../../entities/product.entity";
import { ProductModel } from "../models/product.model.mongo";

export class ProductMapper {
  toEntity({
    _id,
    type,
    franchise,
    name,
    releaseDate,
    msrp,
    set,
    rarity,
    cardMarketLink,
    priceChartingLink,
    cardkingdomBuyListLink,
    abugamesBuyListLink,
    starcitygamesBuyListLink,
    boosterCount,
  }: ProductModel): ProductEntity {
    return {
      id: _id.toString(),
      type,
      franchise,
      name,
      releaseDate,
      msrp,
      set,
      rarity,
      cardMarketLink,
      priceChartingLink,
      cardkingdomBuyListLink,
      abugamesBuyListLink,
      starcitygamesBuyListLink,
      boosterCount,
      performance: null,
      market: null,
      buylist: null,
      ratio: null,
      perBooster: null,
    };
  }
}
