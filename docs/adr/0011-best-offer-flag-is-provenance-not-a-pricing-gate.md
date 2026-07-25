# ADR 0011 — The Best-Offer flag is provenance, not a pricing gate

**Status:** Accepted
**Date:** 2026-07-25

**Amends:** ADR 0009 (reinstate the Best-Offer flag)

## Context

ADR 0009 tied two things to a single boolean: *this sale was negotiated* and
*this sale's price is an unrealized ask*. That worked because the Terapeak
upgrade cleared the flag at the same moment it wrote the realized price — one
event, both meanings updated together.

Two problems surfaced in review.

**The flag was lost far more often than the ADR assumed.** `processCard` runs
Terapeak before the eBay search, and Terapeak's window is 30 days against the
search's 4. So for most sales Terapeak creates the row first, and the
`ebay_search && existing.source === "terapeak"` guard then dropped the search's
observation entirely. The flag could only ever survive on rows the search
happened to see first. In practice negotiated sales were silently priced as
ordinary asks — the exact upward bias ADR 0009 set out to remove.

**Clearing the flag destroys information we want to keep.** Whether a sale was
negotiated is a durable fact about that transaction, useful for display and for
reasoning about a card's price behaviour. Overwriting it as a side effect of
repricing conflates a fact with a processing state.

## Decision

**Keep `isBestOffer` as a permanent record of how the sale was struck, and gate
pricing on whether the price is realized instead.**

- **The flag is monotonic.** An eBay-search sighting can raise `isBestOffer` on
  an existing Terapeak row without touching its price; the Terapeak upgrade path
  ORs the flag rather than resetting it. Once true, it stays true.
- **The pricing gate moves to provenance.** `marketPrice.toSalesForPricing`
  excludes a sale when `isBestOffer && source !== "terapeak"` — that is, when it
  is negotiated *and* nobody has supplied the realized price yet. A
  Terapeak-priced best offer counts like any other realized sale.
- **Recovery is unchanged in effect.** Terapeak is still the single path back
  into pricing, and still self-healing with no human in the loop. What changed
  is that recovery now writes only the price, not the price and the flag.

## Reasons

- **Fixes the bias ADR 0009 aimed at**, which the source-precedence rule was
  quietly defeating for the majority of sales.
- **Separates the two meanings** that ADR 0009 overloaded, so neither update has
  to stand in for the other.
- **Keeps a negotiated sale's realized price in the median.** Under ADR 0009 as
  written, a sale whose flag was raised after Terapeak had already priced it
  would have been excluded permanently — a coverage loss with no upside, since
  the price on the row is the realized one.

## Trade-offs accepted

- **A best-offer sale the eBay search sees but Terapeak never indexes still
  contributes nothing.** Unchanged from ADR 0009, and still the right call: an
  excluded comp beats an inflated one.
- **`source` now carries pricing significance**, not just ingest provenance. The
  coupling is explicit in one predicate rather than spread across write paths.
- **Manual price entry is still not restored.** The review queue continues to
  show the Best-Offer badge as display only.
