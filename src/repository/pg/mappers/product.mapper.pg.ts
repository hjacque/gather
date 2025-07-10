import { NewProductEntity, ProductEntity } from "../../../entities/product.entity";
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
    boosterCount,
    productSetId,
    createdAt,
    updatedAt
  }: ProductModel): NewProductEntity {
    return {
      id,
      type,
      name,
      msrp,
      rarity,
      cardMarketLink,
      cardkingdomBuyListLink,
      abugamesBuyListLink,
      boosterCount,
      productSetId,
      createdAt,
      updatedAt
    };
  }
}
