import { ListingEntity } from "../../../entities/listing.entity";
import { ListingModel } from "../models/listing.model.pg";

export class ListingMapper {
  toEntity({
    id,
    cardId,
    platform,
    itemId,
    psaGrade,
    price,
    currency,
    title,
    isBestOffer,
    seller,
    seenAt,
    invalidatedAt,
    createdAt,
    updatedAt,
  }: ListingModel): ListingEntity {
    return {
      id,
      cardId,
      platform,
      itemId,
      psaGrade,
      price,
      currency,
      title,
      isBestOffer,
      seller,
      seenAt,
      invalidatedAt,
      createdAt,
      updatedAt,
    };
  }
}
