import { ProductEntity } from "../../../entities/product.entity";
import { ProductModel } from "../models/product.model.mongo";

export class ProductMapper {
  toEntity({
    _id,
    type,
    franchise,
    name,
    set,
    rarity,
    cardMarketLink,
    priceChartingLink,
    cardkingdomBuyListLink,
    abugamesBuyListLink,
    starcitygamesBuyListLink,
  }: ProductModel): ProductEntity {
    return {
      id: _id.toString(),
      type,
      franchise,
      name,
      set,
      rarity,
      cardMarketLink,
      priceChartingLink,
      cardkingdomBuyListLink,
      abugamesBuyListLink,
      starcitygamesBuyListLink,
      performance: null,
      market: null,
      buylist: null,
      ratio: null,
    };
  }
}
