import { ProductEntity } from "../../../entities/product.entity";
import { ProductModel } from "../models/product.model.pg";

export class ProductMapper {
  toEntity({
    id,
    type,
    name,
    msrp,
    rarity,
    cardMarketLink,
    cardkingdomBuyListLink,
    abugamesBuyListLink,
    fullSetLink,
    tcgpLink,
    boosterCount,
    productSetId,
    tags,
    createdAt,
    updatedAt
  }: ProductModel): ProductEntity {
    return {
      id,
      type,
      name,
      msrp,
      rarity,
      cardMarketLink,
      cardkingdomBuyListLink,
      abugamesBuyListLink,
      fullSetLink,
      tcgpLink,
      boosterCount,
      productSetId,
      tags,
      createdAt,
      updatedAt
    };
  }
}
