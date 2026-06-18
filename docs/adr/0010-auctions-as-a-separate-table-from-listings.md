# ADR 0010 — Store eBay auctions in their own table, not on `Listing`

**Status:** Accepted
**Date:** 2026-06-18

## Context

The Live Auctions page needs ongoing EU eBay auctions per Card. An auction is
scraped from almost the same eBay.fr search as a buy-it-now **Listing** (only
`LH_Auction=1` vs `LH_BIN=1`) and shares the same grade/EU/seller classification,
so the obvious instinct is to add a `listingType` discriminator and a few
nullable columns (`endTime`, `currentBid`, `bidCount`) to `Listing` and reuse one
table and one repository.

We rejected that. Today **every** `Listing` row feeds the per-grade buy-side
minimum (→ Market Price → Opportunity Score). An auction's current bid is a
*moving asking price you cannot buy at* — `activeListingsLink.ts` already
excludes auctions from the buy side for exactly this reason. Putting auctions in
`Listing` means a single forgotten `WHERE listingType = 'bin'` silently corrupts
Market Price with bid values.

## Decision

Auctions live in their own `Auction` table, entirely separate from `Listing`.
The buy-side aggregation queries only `Listing`, so an auction bid is
**structurally incapable** of reaching a Derived Price — no filter to remember,
no nullable price-vs-bid ambiguity. The two pipelines share only the *pure*
helpers (`parseListingTitle`, `euLocation`, the seller gate, row-extractor
scaffolding), which are already decoupled from storage.

## Consequences

- Two near-identical eBay.fr scrape pipelines and tables exist
  (`SyncListingsUsecase`/`Listing` and `SyncAuctionsUsecase`/`Auction`). The
  duplication is the price of the structural invariant.
- `Auction` carries auction-only fields (`endTime`, `currentBid`, `bidCount`,
  `bidCheckedAt`) and no `isBestOffer`; lifecycles diverge too — Listings are
  full-replaced, Auctions are also pruned once `endTime` passes (ephemeral, no
  history; realized outcomes are captured as `Sale` rows via Terapeak, ADR 0007).
- If auctions ever need to feed pricing, that becomes a deliberate new read
  against `Auction`, never an accident.
