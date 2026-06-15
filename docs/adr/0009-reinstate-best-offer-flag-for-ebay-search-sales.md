# ADR 0009 — Reinstate the Best-Offer flag for eBay-search sales

**Status:** Accepted
**Date:** 2026-06-15

**Amends:** ADR 0008 (dual-source sales)
**Reverses:** the Best-Offer retirement (commit `cf97947`)

## Context

ADR 0007 retired `Sale.isBestOffer` on the premise that *every* Sale comes from
Terapeak, which reports the realized transaction price — so no Sale could ever be
a Best-Offer placeholder showing an inflated ask. That premise held for exactly
one ADR.

ADR 0008 reintroduced a second ingest path: the real-time eBay completed-listings
search, which fills the ~4-day freshness gap before Terapeak indexes a sale. The
public search has the original limitation ADR 0002 called out — **a Best-Offer
sale shows the *asking* price, not the *accepted* one.** With the flag gone, those
inflated asks flowed straight into the recency-weighted median, biasing Market
Sale Price upward for any grade whose only recent comps were gap-fill best
offers.

## Decision

**Reinstate `Sale.isBestOffer`, set it only on the eBay-search source, and
exclude flagged sales from pricing until Terapeak corrects them.**

- **Schema:** re-add `Sale.isBestOffer Boolean @default(false)`. Existing rows are
  all Terapeak-sourced (realized prices), so the default backfills them correctly.
- **Provenance of the flag:** only `ingestEbaySearchSales` sets it (from the
  search row's `isBestOffer`). Both Terapeak write paths set `false` — Terapeak's
  price is always realized.
- **Pricing gate:** `marketPrice.toSalesForPricing` drops any `isBestOffer` sale,
  the same way it drops `status: "invalid"`. There is **no manual price-entry
  recovery** (unlike the pre-0007 design): a best-offer sale counts again only
  once Terapeak upgrades the row, which overwrites the price *and clears the flag*
  (`isBestOffer = false`).
- **Freeze override:** the Sale upsert freezes reviewed rows against re-scrape to
  protect human corrections. But an eBay-search best-offer from a trusted seller
  is **auto-confirmed at ingest** (`reviewedAt` stamped) — a trust shortcut, not a
  human correction. So a **Terapeak upgrade of an `ebay_search` row bypasses the
  freeze**; otherwise such a row would stay best-offer forever and never re-enter
  pricing.
- **Differentiation:** `isBestOffer` is re-exposed on `SaleRecord` /
  `ReviewSaleRecord`, and the review queue shows a "Best Offer" badge (display
  only — no price-entry field).

## Reasons

- **Removes the upward bias** ADR 0008 accepted as a known trade-off, at the price
  of one boolean and one gate.
- **Self-healing, no human in the loop.** Terapeak's authoritative price is the
  single recovery path, consistent with ADR 0007's "Terapeak is the source."
- **Correct by construction.** Tying the exclusion to the flag (not to review
  state) means a corrected row re-enters pricing automatically when Terapeak
  clears the flag.

## Trade-offs accepted

- **A best-offer sale contributes nothing until Terapeak catches up** (~4 days),
  and **nothing ever** if Terapeak never indexes it (a coverage gap). Accepted:
  an excluded comp is better than an inflated one, and manual price entry was
  deliberately not restored.
- **`isBestOffer` is only as good as the search row's parse** (`/best offer/i` on
  the listing row). A missed flag re-admits one inflated ask; a false positive
  needlessly excludes one realized sale. Both are bounded and self-correct on the
  Terapeak upgrade.
- **The freeze override is scoped narrowly** to terapeak-over-ebay_search. A
  genuine human grade correction on an ebay_search row (rare, within the 4-day
  window) can still be overwritten by the Terapeak upgrade — accepted, since
  Terapeak carries the same title parse and a strictly better price.
