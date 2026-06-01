import { SaleEntity } from "../../../entities/sale.entity";
import { SaleModel } from "../models/sale.model.pg";

export class SaleMapper {
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
    status,
    verificationStage,
    soldAt,
    createdAt,
    updatedAt,
  }: SaleModel): SaleEntity {
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
      status,
      verificationStage,
      soldAt,
      createdAt,
      updatedAt,
    };
  }
}
