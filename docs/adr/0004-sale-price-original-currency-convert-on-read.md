# ADR 0004 — Store Sale prices in original currency, convert to EUR on read

**Status:** Accepted  
**Date:** 2026-06-01

## Context

The platform's existing convention (see CONTEXT.md, *Raw Price*) is that prices are **expressed in EUR after conversion where needed** — i.e. normalized at write time using a current exchange rate, with the original value discarded. Raw Prices are daily snapshots, so a stale rate baked into a single day's value is harmless.

Sales (#84) are different: they are an **immutable historical record** of individual transactions, accumulated over a trailing window and read back as a time-series scatter graph in the card side panel. A Sale from many months ago is a permanent fact, not a daily snapshot. eBay sold prices also arrive in the marketplace's native currency (USD on eBay.com, EUR on eBay.de, etc.).

## Decision

Store each Sale's **original `price` plus a `currency` code**, never EUR-normalized at write time. Convert to EUR at **read time** using today's rate when building the side-panel graph. Initially only USD and EUR are supported; Sales in other currencies are stored (price + currency preserved) but excluded from EUR views until conversion is added.

## Reasons

- **Sales are immutable history** — normalizing at write time bakes in whatever rate happened to apply on the scrape day and destroys the original price. The true transaction amount in its native currency is the durable fact worth keeping.
- **Read-time conversion is reversible and additive** — keeping `price` + `currency` means we can later switch to historical-rate conversion (storing a daily FX table and converting by each Sale's `soldAt`) without migrating any stored Sale data.
- **Today's rate is acceptable, and arguably better, for the MVP goal** — the graph exists to spot *current* buying opportunities; valuing all dots on a consistent present-day-EUR basis is more comparable than mixing historical rates, and there is no historical FX store today.

## Trade-offs accepted

- **Deliberate deviation from the Raw Price convention** — a reader expecting "all prices are EUR" will find Sales store native currency instead. This ADR exists primarily to stop that surprise from being "fixed" into a write-time normalization that would lose data.
- **Older dots drift under today's rate** — a Sale from 360 days ago is shown at today's rate, not the rate on its sale day. Accepted for the MVP; resolvable later via historical FX (above) precisely because the original price is retained.
- **Limited currency support initially** — only USD/EUR convert; other-currency Sales are stored but invisible in EUR views until conversion is extended.
