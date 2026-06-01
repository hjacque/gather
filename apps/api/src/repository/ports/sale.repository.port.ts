import { SaleEntity, NewSale } from "../../entities/sale.entity";

export abstract class SaleRepositoryPort {
  // Upsert a scraped Sale keyed on (platform, itemId). On conflict the mutable
  // scraped fields are refreshed; status and verificationStage are left intact
  // because they are owned by the re-verification pass.
  abstract upsert(sale: NewSale): Promise<void>;

  // All Sales for a Card, oldest first. Includes pending and cancelled; the
  // read layer decides what to surface.
  abstract getCardSales(cardId: string): Promise<SaleEntity[]>;
}
