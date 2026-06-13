# ADR 0007 — Source eBay sales from Terapeak, verify sellers on item pages

**Status:** Accepted
**Date:** 2026-06-14

**Supersedes:** ADR 0002 (scrape eBay public completed-listings search)

## Context

ADR 0002 sourced Sales by scraping eBay's **public** completed-listings search
(`LH_Sold=1&LH_Complete=1`) from each Card's `ebayLink`. That worked but carried
the limitation called out in its own trade-offs: for **Best Offer** sales the
public page shows only the *listed* price, never the *accepted* amount. Those
prices are therefore biased upward, and the only recovery was manual Sale Review
typing in the true price.

We re-investigated and found that **Terapeak** (eBay Seller Hub → Product
Research) reports eBay's *authoritative* per-listing transaction price — accepted
Best Offers included — for any seller account. It is the same data Marketplace
Insights exposes via API, reachable through the browser we already drive.

Two findings shaped the design:

- **Terapeak carries no seller info.** Its result rows have the listing title
  (PSA grade lives there), the eBay item id, the true sold price, and the sold
  date — but no seller name or feedback. The eBay item page still has that.
- **Terapeak is seller-only and the session is short-lived** (~hours). A full
  all-Cards run takes far longer than one session if anything slow runs while we
  hold it.

A direct join of Terapeak rows to the old public-search Sales by item id was
also tried and **abandoned**: the two surfaces return near-disjoint listing sets
(~2% item-id overlap), because eBay search fuzzy-matches titles and Terapeak does
not. Terapeak must be the *source*, not an overlay.

## Decision

**Terapeak is the Sale source; eBay item pages verify seller trust.**

- The **Terapeak source** (`TerapeakSalesSource`) fetches each Card's sold rows
  from Seller Hub research, windowed just past the trailing 30-day Sale window so
  every returned row is in-window (no reliance on result sort, ~1 page/Card).
  Grade and Card attribution are parsed from the row title by the existing
  Listing Title Parser. Prices are the true accepted prices, so Sales are stored
  with `isBestOffer = false`.
- **eBay item pages** supply seller quality: for each sale, `fetchSellerQuality`
  reads the listing's seller card and applies the same trust rules as before
  (PSA store / reputation bar → auto-confirm; see ADR 0006).

The batch run (`executeBatch`) is **split into two phases** so it survives the
short Terapeak session:

1. **Phase 1 — authenticated, fast:** fetch every Card's Terapeak sales and
   persist them as `pending`. The only part needing the login; finishes inside
   one session. If the session lapses it throws `TerapeakAuthError`, which the
   batch catches to **stop fetching but still finalize everything ingested**, and
   logs the exact re-auth command (`TERAPEAK_REAUTH_CMD`).
2. **Phase 2 — public, no auth:** seller-verify each ingested sale on its eBay
   item page (auto-confirm/-invalidate), then run the existing 7d/30d
   re-verification pass and recompute snapshots. This is the slow stretch, and it
   needs no session, so expiry no longer bounds the run.

The login itself is manual and out of band: `scripts/terapeakLogin.ts` opens the
shared persistent Chrome profile on a real display so an operator signs in once;
the cookie persists and headless syncs reuse it.

## Reasons

- **True accepted prices.** The original best-offer limitation disappears at the
  source — no asking-price bias, no manual price-enrichment step.
- **Authoritative data.** Terapeak is eBay's own sold record, so phantom/fake
  completed-listings (a hazard of the public search) are not present.
- **Session resilience by construction.** Bounding the authenticated work to a
  fast Phase 1 is more robust than fighting eBay's session limits or scripting a
  bot-checked login flow.
- **Reuse.** The Listing Title Parser, trusted-seller rules, re-verification
  pass, snapshot service, and `SaleRepositoryPort` are all unchanged — only the
  source and the run shape changed.

## Trade-offs accepted

- **Auth is manual and expires.** A long run can still outlast a session; it then
  finalizes what it ingested and logs the re-auth command to re-run. Accepted
  over fragile automated login.
- **Seller verification costs an item-page visit per sale** (Phase 2). Slow, but
  unauthenticated and off the session clock.
- **Aggregated rows lose per-sale granularity.** A multi-quantity Terapeak row
  (`soldCount > 1`, rare for graded singles) is stored as one Sale at the average
  price. Per-transaction expansion is deferred.
- **Coverage tracks Terapeak's keyword matching**, which is stricter than eBay
  search; a sale whose title doesn't match the query is missed. Accepted for the
  accuracy gain.
- **Reversible behind the port.** If Marketplace Insights API access is ever
  granted, the source can be swapped behind `SaleRepositoryPort` without touching
  the schema or downstream consumers — same escape hatch ADR 0002 noted.
