import { SaleEntity, NewSale, SaleVerification } from "../../entities/sale.entity";

export abstract class SaleRepositoryPort {
  // Upsert a scraped Sale keyed on (platform, itemId). On conflict the mutable
  // scraped fields are refreshed; status and verificationStage are left intact
  // because they are owned by the re-verification pass.
  abstract upsert(sale: NewSale): Promise<void>;

  // All Sales for a Card, oldest first. Includes pending and cancelled; the
  // read layer decides what to surface.
  abstract getCardSales(cardId: string): Promise<SaleEntity[]>;

  // Sales due for a re-verification checkpoint, relative to `now`:
  //   - pending + unverified, first scraped ≥ 7 days ago  (7-day check)
  //   - pending + checked_7d, first scraped ≥ 30 days ago (30-day check)
  // Age keys off createdAt (when first scraped), not soldAt. Terminal Sales
  // (confirmed/cancelled) are never returned. Optionally scoped to one Card.
  abstract getSalesDueForVerification(
    now: Date,
    cardId?: string
  ): Promise<SaleEntity[]>;

  // Apply a re-verification outcome (new status + stage) to a Sale.
  abstract updateVerification(
    saleId: string,
    verification: SaleVerification
  ): Promise<void>;
}
