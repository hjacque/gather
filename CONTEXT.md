# Gather

A price aggregation and performance tracking platform for collectible trading cards and LEGO products. It fetches prices from multiple external marketplaces (Price Sources) and surfaces Derived Prices and Performance metrics to users via a dashboard.

## Monorepo layout

```
apps/
  api/   — Node.js + Express HTTP server (price sync, data queries)
  web/   — Next.js dashboard (server actions call the API)
packages/
  types/        — canonical domain types (ProductEntity, Franchise, PriceType, …)
  api-contract/ — typed request/response shapes shared between api and web
```

`packages/types` is the single source of truth for domain types.  
`packages/api-contract` re-exports from types and adds the HTTP contract shapes (`GetProductsResponse`, `GetProductResponse`, etc.) — the web app imports from here, never from types directly.

## API architecture

The API is layered. Dependency direction: `transport → application → repository`.

| Layer | Location | Responsibility |
|---|---|---|
| Transport | `src/transport/http/` | Express routes, request validation (zod), CORS |
| Application | `src/application/` | Use cases, sync orchestration, price aggregation |
| Repository | `src/repository/` | Port interfaces + Prisma/PostgreSQL implementations |
| Services | `src/services/` | Background services (SyncScheduler via node-cron) |

Repositories are injected into use cases via port interfaces — concrete Prisma implementations are wired in `initRepository()`.

## API routes

| Method | Path | Description |
|---|---|---|
| GET | `/products` | List products with today's Derived Prices and Performance |
| GET | `/products/:id` | Single product with full price history |
| GET | `/product-of-the-day` | Top-performing product for a given day |
| GET | `/sync` | Trigger a full Sync (filter by franchise/type/set/tags) |
| GET | `/sync/product/:id` | Trigger a Sync for a single product |
| GET | `/sync/set/:set` | Trigger a Sync for an entire Product Set |

## Tech stack

- **Language:** TypeScript throughout
- **API runtime:** Node.js, Express, Prisma ORM, PostgreSQL
- **Web:** Next.js (App Router), server actions call the API via `apiClient`
- **Build:** Turborepo monorepo
- **Scheduling:** node-cron inside `SyncSchedulerService`

## Language

**Product**:
A tradeable item tracked by the platform — a single card, sealed box, booster bundle, elite trainer box, or LEGO minifigure.
_Avoid_: Item, card, article

**Product Set**:
A named release grouping Products under a shared franchise and release date (e.g. "Scarlet & Violet Base Set").
_Avoid_: Set, expansion, collection

**Franchise**:
The trading card or toy brand a Product belongs to (MTG, Pokémon, One Piece, Riftbound, LEGO).
_Avoid_: Game, brand, category

**Price Source**:
An external marketplace from which a Raw Price is scraped for a given Product (e.g. CardMarket, CardKingdom, TCGPlayer, Abugames, BrickLink).
_Avoid_: Marketplace, vendor, site, scraper

**Raw Price**:
A price value obtained directly from a single Price Source, expressed in EUR after conversion where needed.
_Avoid_: Scraped price, source price

**Derived Price**:
A price computed from one or more Raw Prices — Market Price, Buylist Price, Ratio, or Per Booster.
_Avoid_: Calculated price, computed price, aggregated price

**Market Price**:
The minimum selling price across all applicable Price Sources for a Product on a given day.
_Avoid_: Spot price, current price, listing price

**Buylist Price**:
The maximum purchase offer across all buylist Price Sources for a Product on a given day.
_Avoid_: Buy price, offer price, trade-in price

**Ratio**:
The percentage spread between Market Price and Buylist Price (or BrickLink Average for minifigures), indicating seller profit margin.
_Avoid_: Spread, margin, markup

**Performance**:
The percentage change in Market Price or Buylist Price over a fixed period (daily, weekly, monthly, yearly).
_Avoid_: Delta, change, trend, gain/loss

**Sync**:
The process of fetching Raw Prices from all applicable Price Sources for one or more Products and persisting the results.
_Avoid_: Scrape, update, refresh, import

## Price Sources

| Source | Type | Franchises | Notes |
|---|---|---|---|
| CardMarket | Sell listings | MTG, Pokémon, One Piece, Riftbound | Lowest listing → Market Price |
| CardKingdom | Buylist | MTG | Contributes to Buylist Price |
| ABUGames | Buylist | MTG | Contributes to Buylist Price |
| TCGPlayer | Sell listings | MTG | Raw Price only, stored as `tcgp` |
| BrickLink | Sell listings | LEGO | Raw Price for minifigures |
| BrickLink Average | Market average | LEGO | Used instead of Buylist for minifigure Ratio |
| FullSet | Sell listings | MTG | Full-set bundle price |

## Derived Price computation

All derivation happens in `priceAggregator.ts` after Raw Prices are collected:

- **Market Price** — `min(cardmarket)` (currently single source; architecture supports multiple)
- **Buylist Price** — `max(cardkingdom, abugames)`; whichever is higher wins
- **Ratio** — non-minifigures: `round((market / buylist) * 100) - 100`; minifigures: `round((market / bricklinkAverage) * 100) - 100`
- **Per Booster** — `market / boosterCount`; only for sealed products with a known booster count

## Sync schedule (UTC, via node-cron)

| Product type | Frequency | Times |
|---|---|---|
| Singles | Every 2 hours | :00 on even hours (0, 2, 4, … 22) |
| Sealed products | Every 2 hours | :30 on odd hours (1:30, 3:30, … 23:30) |
| Minifigures | Every 15 minutes | (defined but not scheduled by default) |

## Relationships

- A **Product** belongs to exactly one **Product Set**
- A **Product** has zero or more **Raw Prices**, one per **Price Source** per day
- **Derived Prices** are computed from a Product's **Raw Prices** for a given day
- **Performance** is computed from a Product's **Market Price** or **Buylist Price** across two dates
- A **Sync** produces **Raw Prices** for each applicable **Price Source**, then derives **Derived Prices** and **Performance**

## Example dialogue

> **Dev:** "When we add a new Price Source, do we need to change the Market Price calculation?"
> **Domain expert:** "No — Market Price is always the minimum across whichever Raw Prices exist. A new Price Source just adds another candidate to that minimum."

> **Dev:** "Is the Ratio a Raw Price or a Derived Price?"
> **Domain expert:** "Derived — it's computed from Market Price and Buylist Price, never scraped directly."

## Flagged ambiguities

- "price" alone is ambiguous — always qualify as Raw Price, Derived Price, Market Price, Buylist Price, or a specific source name (e.g. "the CardMarket price").
