import { SaleEntity, NewSale, SaleVerification } from "../../entities/sale.entity";

export type UnreviewedSalesCursor = {
  oldestSoldAt: Date;
  cardId: string;
};

export type UnreviewedSalesCard = {
  card: {
    id: string;
    name: string;
    number: string | null;
    imageUrl: string | null;
    setName: string;
  };
  sales: SaleEntity[];
};

export abstract class SaleRepositoryPort {
  abstract upsert(sale: NewSale): Promise<boolean>;

  abstract getSaleById(saleId: string): Promise<SaleEntity>;

  abstract getCardSales(cardId: string): Promise<SaleEntity[]>;

  abstract getCardsSales(cardIds: string[]): Promise<Map<string, SaleEntity[]>>;

  abstract getSalesDueForVerification(
    now: Date,
    cardId?: string
  ): Promise<SaleEntity[]>;

  abstract updateVerification(
    saleId: string,
    verification: SaleVerification
  ): Promise<void>;

  abstract markInvalid(saleId: string): Promise<void>;

  abstract getUnreviewedSalesByCard(
    pageSize: number,
    after?: UnreviewedSalesCursor
  ): Promise<{
    cards: UnreviewedSalesCard[];
    totalCards: number;
    nextCursor: UnreviewedSalesCursor | null;
  }>;

  abstract markReviewed(
    saleId: string,
    edits: { psaGrade?: number; price?: number }
  ): Promise<void>;

  abstract getUnreviewedCount(): Promise<number>;
}
