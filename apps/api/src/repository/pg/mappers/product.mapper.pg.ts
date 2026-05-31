import { ProductEntity } from "../../../entities/product.entity";
import { ProductModel } from "../models/product.model.pg";

export class ProductMapper {
  toEntity({
    id,
    name,
    foilPattern,
    imageUrl,
    releaseDate,
    cardMarketLink,
    psaLink,
    number,
    productSetId,
    tags,
    note,
    regions,
    createdAt,
    updatedAt,
  }: ProductModel): ProductEntity {
    return {
      id,
      name,
      foilPattern,
      imageUrl,
      releaseDate,
      cardMarketLink,
      psaLink,
      number,
      productSetId,
      note,
      tags,
      regions,
      createdAt,
      updatedAt,
    };
  }
}
