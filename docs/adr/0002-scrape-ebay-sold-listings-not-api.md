# ADR 0002 — Scrape eBay sold listings instead of using the eBay API

**Status:** Accepted  
**Date:** 2026-06-01

## Context

Issue #84 requires gathering eBay sold (completed) listings per Card per PSA grade — the data foundation that gates Base Range, Grade Liquidity Share, and the entire Opportunity Score. The obvious first instinct is to use an official eBay API rather than scrape, since scraping is brittle and against the spirit of most terms of service.

We investigated eBay's developer APIs for sold/completed-listing data:

- **Finding API** (`findCompletedItems`) — the historical way to query completed listings. Deprecated 2020-10-15, and the entire Finding API was **decommissioned on 2025-02-05**. No longer callable.
- **Browse API** (Buy APIs) — returns only *active* listings. Sold-listing data is explicitly excluded.
- **Marketplace Insights API** — does expose sold data, but access is **restricted to approved eBay Business partners** (a gated, high-bar developer program), not available to general developers.

There is no API path to sold-listing data available to this project.

## Decision

Scrape eBay's public completed-listings search results (`LH_Sold=1&LH_Complete=1`) using the existing Puppeteer-real-browser + stealth infrastructure already used for CardMarket. Each Card stores a curated `ebayLink` (full search URL); the Sale Sync navigates to it and parses result rows.

## Reasons

- **No alternative exists** — the only API with sold data (Marketplace Insights) is partner-gated and not obtainable for this use case; the Finding API is decommissioned.
- **Infrastructure already exists** — the project already drives a stealth headless browser through Cloudflare/rate-limit handling for CardMarket, so scraping eBay reuses a proven path rather than introducing new machinery.
- **Public, unauthenticated pages** — eBay completed-listings search is viewable without login for typical card queries.

## Trade-offs accepted

- **Brittleness** — scraping breaks when eBay changes its DOM. The same risk already applies to CardMarket and PSA scraping; this is an accepted operational cost of the whole platform.
- **No accepted-offer price** — for Best Offer sales the page shows only the listed price, not the accepted amount (see the Sale model and #84 follow-up). This is a data-source limitation, not a consequence of scraping vs API.
- **Revisit if access changes** — if eBay ever grants Marketplace Insights access (or a successor API ships), the Sale Sync's scraping source can be swapped behind the same `SaleRepositoryPort` without touching the schema or downstream consumers.
