# ADR 0005 — Sale Review overwrites scraped fields in place

**Status:** Accepted
**Date:** 2026-06-03

## Context

ADR 0004 stores Sale prices in original currency *because "Sales are immutable history."* Sale Review (the admin backoffice page) now introduces the first sanctioned human mutation of a scraped Sale: correcting a misclassified `psaGrade`, and entering the true accepted `price` for a Best-Offer Sale whose scraped price is only the listing price. This contradicts the immutability rationale, so the storage strategy for corrections needs a deliberate call: overwrite the scraped field in place, or preserve the original alongside the correction (audit columns).

## Decision

**Overwrite the scraped field in place.** Review mutates `psaGrade` and `price` directly on the `Sale` row and stamps `reviewedAt`; no original-value audit columns are added. "Immutable" is reinterpreted as **"never auto-rewritten by the Sale Sync"** rather than "never changed at all" — a guarantee now enforced by freezing reviewed Sales against the daily upsert (a reviewed Sale's scraped fields are a no-op on conflict; only re-verification of `pending` Sales still applies).

## Reasons

- **Grade provenance is already retained** — the raw `title` is stored, so the parser's original grade guess is always re-derivable. Overwriting `psaGrade` loses nothing recoverable.
- **The Best-Offer listing price has no analytical value** once the true accepted price is known — it is an inflated ask, not a realized transaction, and is precisely what review exists to discard.
- **Single-user tool** — there is no second reviewer to reconcile against, and an audit trail of corrections is overhead we would never read.

## Trade-offs accepted

- **The originally-scraped Best-Offer listing price is destroyed** by the correction and is not reconstructable from anything stored. Accepted: it carries no value once enriched.
- **Corrections are not reversible** without re-deriving from the `title` (grade) or re-scraping (price, where still live). Accepted for a single-user workflow; revisit with audit columns if review ever becomes multi-user or error-prone.
