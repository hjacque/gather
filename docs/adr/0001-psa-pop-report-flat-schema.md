# ADR 0001 — PSA Pop Report: flat schema over normalized per-grade rows

**Status:** Accepted  
**Date:** 2026-05-17

## Context

The Exclusive Promos page requires displaying PSA population report data (grade counts 1–10) for each Pokémon promo single. We need to decide how to persist this data in PostgreSQL.

Two candidate schemas:

**Normalized** — one row per `(productId, grade)`:
```sql
PsaPopReport(id, productId, grade INT, count INT, syncedAt)
-- 10 rows per product
```

**Flat** — one row per product with 10 grade columns:
```sql
PsaPopReport(id, productId, grade1 INT, ..., grade10 INT, syncedAt)
-- 1 row per product
```

## Decision

Use the **flat schema** (one row per product, `grade1`…`grade10` columns).

## Reasons

- **Query simplicity** — displaying all 10 grades in the side panel requires no aggregation or pivot; a single `SELECT` returns everything needed.
- **PSA Total** (sum of all grades for the table column) is a trivial `grade1 + ... + grade10` expression rather than a `GROUP BY + SUM`.
- **Sync upsert** — updating all 10 grades from a single scrape is one `UPSERT` on the primary key rather than 10 individual upserts.
- **Pop counts are always read as a unit** — there is no use case for querying a single grade in isolation from the others.

## Trade-offs accepted

- Adding a grade (e.g. PSA Authentic, half-grades) requires a schema migration rather than a new row.
- The normalized form would be more flexible if we later need per-grade time-series history (e.g. tracking how grade counts change over time). That use case is explicitly out of scope and will require a separate design if it arises.

## Note on grade-based price tracking

Grade-based price tracking was subsequently implemented by extending the existing `PriceType` enum with `cardmarketPsa1`…`cardmarketPsa10` and reusing the `Price` model — not via a separate `PsaGradePrice` entity as originally anticipated. The `Price` model's `(productId, date, type)` unique constraint handles per-grade-per-day storage cleanly, and the separation cost of a new entity outweighed the benefit.
