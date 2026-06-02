# ADR 0003 — Platform-agnostic `Sale` entity instead of `EbaySale`

**Status:** Accepted  
**Date:** 2026-06-01

## Context

Issue #84 introduces a new table to store individual completed transactions for a Card at a specific PSA grade. Today the only source of this data is eBay (see ADR 0002). The straightforward modelling choice would be an `EbaySale` table named for its single source.

## Decision

Name the entity **`Sale`** and give it a `platform` enum field (initially just `ebay`). The natural key is `(platform, itemId)`.

## Reasons

- **More sources are anticipated** — the broader Fair Value design already references other secondary marketplaces (Fanatics Collect, Goldin, MySlabs, etc., surfaced during research). A platform-neutral table absorbs them by adding an enum value, not a new table and a parallel sync/repository/UI stack.
- **Renaming a persisted entity is expensive** — once `EbaySale` exists with a migration, foreign keys, repository ports, API-contract types, and a UI graph wired to it, renaming to `Sale` later is a coordinated change across the whole stack. Choosing the general name up front costs nothing now.
- **Downstream consumers are source-agnostic** — Base Range and Opportunity Score (#91) care about *sold comps*, not which marketplace produced them. The domain concept is "a sale," and the platform is an attribute of it.

## Trade-offs accepted

- **Slight present-day over-generalization** — only `ebay` exists, so the `platform` field is a single-value enum for now. This is a deliberate, cheap hedge; the alternative (rename later) is the expensive path.
- **`(platform, itemId)` global uniqueness** — because an eBay item ID is globally unique, a given sale attaches to exactly one Card; an ambiguous listing matched by two Cards' searches sticks to whichever Sale Sync scrapes it first. This is preferred over per-Card uniqueness, which would let one physical sale double-count across two Cards' Base Ranges. Tight `ebayLink` curation is the primary guard against the overlap.
