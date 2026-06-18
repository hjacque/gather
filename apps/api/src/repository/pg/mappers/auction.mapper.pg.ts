import { AuctionEntity } from "../../../entities/auction.entity";
import { AuctionModel } from "../models/auction.model.pg";

export class AuctionMapper {
  toEntity({
    id,
    cardId,
    platform,
    itemId,
    psaGrade,
    currentBid,
    currency,
    bidCount,
    endTime,
    title,
    seller,
    location,
    bidCheckedAt,
    seenAt,
    invalidatedAt,
    gradeEditedAt,
    createdAt,
    updatedAt,
  }: AuctionModel): AuctionEntity {
    return {
      id,
      cardId,
      platform,
      itemId,
      psaGrade,
      currentBid,
      currency,
      bidCount,
      endTime,
      title,
      seller,
      location,
      bidCheckedAt,
      seenAt,
      invalidatedAt,
      gradeEditedAt,
      createdAt,
      updatedAt,
    };
  }
}
