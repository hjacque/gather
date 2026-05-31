import { CardSetEntity } from "../../../entities/cardSet.entity";
import { CardSetModel } from "../models/cardSet.model.pg";

export class CardSetMapper {
  toEntity({
    id,
    name,
    code,
    block,
    releaseDate,
    createdAt,
    updatedAt
  }: CardSetModel): CardSetEntity {
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
