# ADR 0008 — Run Terapeak and the eBay search together, with provenance-guarded reconciliation

**Status:** Accepted
**Date:** 2026-06-15

**Amends:** ADR 0007 (source eBay sales from Terapeak)

## Context

ADR 0007 made Terapeak the sole Sale source and demoted the public
completed-listings search (ADR 0002, `EbaySalesSource.fetch` — never deleted) to
seller verification. In practice this left a **freshness hole**: Terapeak lags
~2–3 days behind a sale, so on June 13–14 we ingested no sales at all for days
that clearly had them. Terapeak is authoritative but not timely; the public
search is timely but not authoritative (its Best-Offer rows show the asking
price, not the accepted one — the exact bias ADR 0007 adopted Terapeak to fix).

ADR 0007 already established the two surfaces cannot be joined by item id (~2%
overlap; eBay search fuzzy-matches titles, Terapeak does not). So they must run
as **two independent ingest paths into the same `Sale` table**, deduped by the
existing `(platform, itemId, cardId)` key — not as an overlay.

The hard requirement: a later public-search re-scrape must **never** clobber a
true Terapeak price with a possibly-inflated asking price.

## Decision

**Both sources run every sync; a provenance column makes Terapeak always win.**

- **`Sale.source` (`SaleSource` enum: `terapeak | ebay_search`)** records which
  scraper supplied each row's price. New column, defaults to `terapeak`; the
  migration backfills all existing rows to `terapeak` (they predate the
  dual-source ingest and sit inside Terapeak's authoritative window).
- **Reconciliation lives in `SaleRepositoryPg.upsert`** as a one-line guard: an
  `ebay_search` upsert is a **no-op when the existing row is `terapeak`** (never
  downgrade). A `terapeak` upsert always writes and stamps `source = terapeak`,
  **upgrading** a row the public search ingested first and correcting any
  Best-Offer overstatement. Reviewed rows stay frozen, exactly as before.
- **The eBay-search path fills only the fresh gap** Terapeak hasn't indexed yet.
  `ingestEbaySearchSales` keeps candidates with `soldAt` within the trailing
  `EBAY_SEARCH_GAP_DAYS = 4`; older sales are Terapeak's to report. Because
  public-search rows carry seller/trust/activity inline, the same trust gate as
  ADR 0006 is applied **at ingest** (trusted seller / PSA store → auto-confirm;
  zero-activity → auto-invalidate; otherwise pending) with **no item-page visit**.
- **Wiring follows ADR 0007's phase split.** Per-card ingest runs Terapeak →
  eBay-search → verify. In `executeBatch` the eBay-search ingest runs in
  **Phase 2** (public, no auth), keeping the authenticated Terapeak work bounded
  to the short Phase 1 session.

## Reasons

- **Freshness without losing authority.** The gap window gives same-day coverage;
  the provenance guard guarantees Terapeak's accepted price overwrites the
  search's asking price the moment it catches up.
- **No new join, no schema overlay.** One column and one upsert branch — the
  abandoned item-id join from ADR 0007 stays abandoned.
- **Reuse.** The Listing Title Parser, trusted-seller rules, re-verification pass,
  snapshot service, and `SaleRepositoryPort` are unchanged; only a second ingest
  path and the provenance check were added.
- **Cheap freshness.** eBay-search rows self-decide trust from data already in the
  search result, so the gap-fill adds no extra item-page loads.

## Trade-offs accepted

- **A best-offer sale can show inflated for up to ~4 days** — the window between
  the public search seeing it and Terapeak correcting it. Bounded by
  `EBAY_SEARCH_GAP_DAYS` and self-healing; accepted over a multi-day blind spot.
- **The public search's fake/phantom-listing hazard returns for gap rows.**
  Mitigated by the ingest-time trust gate (zero-activity sellers auto-invalidate),
  but accepted as the cost of timeliness for that short window.
- **Two sources may both ingest the same listing.** Harmless: deduped by the
  upsert key, and the provenance guard makes the order of arrival deterministic
  (Terapeak wins regardless of who wrote first).
- **`EBAY_SEARCH_GAP_DAYS` is a fixed guess at Terapeak's lag.** Too small reopens
  the hole; too large widens the inflation window. Tunable in one constant.
