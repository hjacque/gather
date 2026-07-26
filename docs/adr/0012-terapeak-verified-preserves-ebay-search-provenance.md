# ADR 0012 — `terapeak_verified` preserves eBay-search provenance through the upgrade

**Status:** Accepted
**Date:** 2026-07-26

**Amends:** ADR 0008 (dual-source Sales), ADR 0011 (Best-Offer flag as provenance)

## Context

ADR 0008 made `Sale.source` a two-value enum and had the Terapeak upsert stamp
`source = terapeak` on every write, including the **upgrade path** — a row the
eBay completed search ingested first, inside the ~4-day gap Terapeak hasn't
indexed yet, which Terapeak later re-supplies with the realized price.

Matching across the two sources already worked and needed no new machinery:
both scrapers key on the eBay item ID, and `Sale` is unique on
`(platform, itemId, cardId)`, so the two sightings land on the same row by
construction. `upsert` even names the case (`terapeakUpgrade`) in order to let
Terapeak overwrite a row a human had already reviewed.

What it did not do was *record* that the case happened. After the upgrade the
row is indistinguishable from one Terapeak reported unaided. That erases a real
distinction: an upgraded row has been observed twice, by two independent
scrapers, and the interval between the sighting and the confirmation is a
signal about the eBay-search path's own accuracy. It also makes the chart unable
to answer the first question you ask of a suspicious dot — where did this price
come from?

## Decision

**Add a third `SaleSource` value, `terapeak_verified`, written on the upgrade
path.**

- **`SaleSource` becomes `terapeak | ebay_search | terapeak_verified`.** The new
  value means: *first seen by the eBay completed search, since re-supplied by
  Terapeak.* The price on the row is Terapeak's realized one — identical in
  pricing weight to `terapeak`, different only in provenance.
- **`SaleRepositoryPg.upsert` resolves the written source** rather than echoing
  the caller's: a `terapeak` write onto a row whose existing source is not
  `terapeak` stores `terapeak_verified`. That covers both the first upgrade
  (`ebay_search` → `terapeak_verified`) and makes the value **sticky** — later
  Terapeak re-scrapes of the same row cannot demote it back to `terapeak`.
- **Pricing eligibility keys off a predicate, not an equality.**
  `isTerapeakPriced(source)` (in `@gather/types`) is true for `terapeak` and
  `terapeak_verified`, and replaces the `source !== "terapeak"` test in ADR
  0011's Best-Offer gate. Without this the new value would silently drop
  upgraded best-offer sales from Market Sale Price — precisely the sales ADR
  0011 exists to reinstate.
- **The never-downgrade guard widens to the same predicate**, so an
  `ebay_search` write onto a `terapeak_verified` row remains a no-op that only
  merges `isBestOffer` upward.
- **`source` is exposed on `SaleRecord`** and rendered in the eBay sales chart's
  pinned dot infobox.

## Trade-offs accepted

- **The label is forward-only.** Rows upgraded before this migration were
  stamped plain `terapeak` and the eBay-search origin is gone; no backfill can
  recover it. Historical upgrades will under-report until the window rolls over.
- **`terapeakUpgrade` keeps its narrow definition** (`existing.source ===
  "ebay_search"`), so it is the *first* upgrade that may overwrite a reviewed
  row. Once a row is `terapeak_verified` the reviewed-row freeze applies again —
  a human edit outranks a second confirmation of a price we already have.
- **Three values where two carried the pricing rule.** Every new consumer of
  `source` must decide between "Terapeak-priced" (the predicate) and "exactly
  this ingest path" (equality). The predicate exists to make the common case the
  easy one.
