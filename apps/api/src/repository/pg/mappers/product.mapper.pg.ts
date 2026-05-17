import { ProductEntity } from "../../../entities/product.entity";
import { ProductModel } from "../models/product.model.pg";

export class ProductMapper {
  toEntity({
    id,
    type,
    name,
    msrp,
    rarity,
    imageUrl,
    cardMarketLink,
    cardkingdomBuyListLink,
    abugamesBuyListLink,
    fullSetLink,
    tcgpLink,
    bricklinkLink,
    psaLink,
    boosterCount,
    productSetId,
    tags,
    keyword,
    blocked,
    createdAt,
    updatedAt,
  }: ProductModel): ProductEntity {
    return {
      id,
      type,
      name,
      msrp,
      rarity,
      imageUrl,
      cardMarketLink,
      cardkingdomBuyListLink,
      abugamesBuyListLink,
      fullSetLink,
      tcgpLink,
      bricklinkLink,
      psaLink,
      boosterCount,
      productSetId,
      tags,
      keyword,
      blocked,
      createdAt,
      updatedAt,
    };
  }
}
