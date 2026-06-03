# ADR 0006 — Trusted-seller Sales are born confirmed, bypassing re-verification

**Status:** Accepted
**Date:** 2026-06-03

## Context

ADR Sale Status rules say a Sale is `confirmed` only after surviving to the 30-day re-verification checkpoint. This rule exists because a `pending` eBay sale can be cancelled, disputed, or relisted within that window, making early confirmation unreliable.

Some eBay seller stores are unconditionally authoritative. PSA's own eBay store (`ebay.com/str/psa`) is the first example: every listing is graded and shipped by PSA itself, so the grade is guaranteed (not guessed from a listing title), the transaction is legitimate, and cancellation is effectively impossible. Treating these Sales as `pending` and running them through the 7-day / 30-day re-verification pipeline adds noise and delay with no quality benefit.

## Decision

**Sales from Trusted Seller stores are persisted with `status = confirmed`, `verificationStage = complete`, and `reviewedAt = now`.** They skip both the manual Sale Review queue and the automated re-verification passes. Their Best-Offer prices count toward Market Sale Price immediately.

The trusted list is a hardcoded constant (`TRUSTED_EBAY_SELLERS` in `constants.ts`). Seller identity is parsed from each result row's store-anchor href at scrape time and stored as `Sale.seller`.

On upsert, existing *unreviewed* Sales from a trusted seller are also upgraded (natural backfill over the 30-day trailing window). Already-reviewed rows are untouched (frozen per ADR 0005).

## Reasons

- **Grade is authoritative, not inferred.** PSA's own listings carry PSA grades by definition — the Listing Title Parser's grade guess is a redundant approximation.
- **Best-Offer enrichment is unnecessary.** PSA's listed price is the actual transacted price; there is no hidden negotiated discount to recover.
- **Re-verification adds no signal.** A PSA store listing at 7 or 30 days tells us nothing the initial scrape didn't already confirm.
- **Review queue would be noise.** Flooding the queue with PSA sales that are trivially correct defeats the purpose of manual review.

## Trade-offs accepted

- **The trusted list is static code, not DB config.** Adding a new trusted seller requires a code change. Accepted for now; if the list grows, migrate to a DB table.
- **No re-verification means no cancellation detection** for trusted-seller Sales. If PSA delists a sale within the window, it stays `confirmed` in the DB. Accepted: PSA store cancellations are rare and commercially inconsequential.
- **This is a deliberate exception to the 30-day confirmation rule** from Sale Status. That rule remains correct for ordinary sellers; this ADR carves out a narrow, well-justified exception.
