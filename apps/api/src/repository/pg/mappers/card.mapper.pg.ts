import { CardEntity } from "../../../entities/card.entity";
import { CardModel } from "../models/card.model.pg";

export class CardMapper {
  toEntity({
    id,
    name,
    foilPattern,
    imageUrl,
    releaseDate,
    cardMarketLink,
    psaLink,
    number,
    cardSetId,
    tags,
    note,
    regions,
    createdAt,
    updatedAt,
  }: CardModel): CardEntity {
    return {
      id,
      name,
      foilPattern,
      imageUrl,
      releaseDate,
      cardMarketLink,
      psaLink,
      number,
      cardSetId,
      note,
      tags,
      regions,
      createdAt,
      updatedAt,
    };
  }
}
