import { SaleEntity, NewSale, SaleVerification } from "../../entities/sale.entity";

// One Card with its unreviewed Sales, for the Sale Review queue. Carries just
// the Card summary fields the review page renders.
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
  // Upsert a scraped Sale keyed on (platform, itemId, cardId): one row per
  // (listing, card) attribution, so the same eBay listing matched to two Cards
  // is two independently-reviewable Sales (invalidate the wrong-card one, keep
  // the right one). On conflict the mutable scraped fields are refreshed;
  // status and verificationStage are left intact
  // because they are owned by the re-verification pass. Reviewed Sales
  // (reviewedAt set) are frozen — their scraped fields are not touched, so an
  // admin's grade/price corrections survive the daily re-scrape.
  // Returns true when a new row was created, false when an existing one was
  // refreshed (or left frozen) — so callers can tell a first-time scrape from a
  // re-scrape and skip work already done for known Sales (e.g. seller checks).
  abstract upsert(sale: NewSale): Promise<boolean>;

  abstract getSaleById(saleId: string): Promise<SaleEntity>;

  // All Sales for a Card, oldest first. Includes pending and invalid; the
  // read layer decides what to surface.
  abstract getCardSales(cardId: string): Promise<SaleEntity[]>;

  // All Sales for many Cards in one query, grouped by cardId. Same inclusivity
  // as getCardSales — used by the list view to derive per-card market prices.
  abstract getCardsSales(cardIds: string[]): Promise<Map<string, SaleEntity[]>>;

  // Sales due for a re-verification checkpoint, relative to `now`:
  //   - pending + unverified, sold ≥ 7 days ago  (7-day check)
  //   - pending + checked_7d, sold ≥ 30 days ago (30-day check)
  // Age keys off soldAt, since the eBay cancellation window runs from the sale
  // date, not from when we first scraped it (Terapeak surfaces sales already
  // days old). Terminal Sales (confirmed/invalid) are never returned.
  // Optionally scoped to one Card.
  abstract getSalesDueForVerification(
    now: Date,
    cardId?: string
  ): Promise<SaleEntity[]>;

  // Apply a re-verification outcome (new status + stage) to a Sale.
  abstract updateVerification(
    saleId: string,
    verification: SaleVerification
  ): Promise<void>;

  // Flag a Sale as user-invalidated. Terminal: the verification stage is moved
  // to complete so the re-verification pass never revisits it.
  abstract markInvalid(saleId: string): Promise<void>;

  // The Sale Review queue: Cards that still have unreviewed Sales
  // (reviewedAt IS NULL AND status = 'pending'), ordered by
  // each Card's oldest unreviewed Sale, paginated by Card (1-based `page`).
  // Each Card bundles only its unreviewed Sales.
  abstract getUnreviewedSalesByCard(
    page: number,
    pageSize: number
  ): Promise<{ cards: UnreviewedSalesCard[]; totalCards: number }>;

  // Record a Sale Review: stamp reviewedAt and apply any admin corrections
  // (a misparsed grade, a wrong price). Edits left undefined are untouched.
  abstract markReviewed(
    saleId: string,
    edits: { psaGrade?: number; price?: number }
  ): Promise<void>;

  // Count of Sales still awaiting review, under the same filter as the queue.
  // Drives the sidebar badge.
  abstract getUnreviewedCount(): Promise<number>;
}
