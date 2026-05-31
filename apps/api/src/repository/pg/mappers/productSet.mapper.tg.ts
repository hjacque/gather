import { ProductSetEntity } from "../../../entities/productSet.entity";
import { ProductSetModel } from "../models/productSet.model.pg";

export class ProductSetMapper {
  toEntity({
    id,
    name,
    code,
    block,
    releaseDate,
    createdAt,
    updatedAt
  }: ProductSetModel): ProductSetEntity {
    return {
      id,
      name,
      code,
      block,
      releaseDate,
      createdAt,
      updatedAt
    };
  }
}
