# Gather

A price aggregation and performance tracking platform for collectible trading cards and LEGO products. Gather fetches Raw Prices from multiple external marketplaces (Price Sources), computes Derived Prices (Market Price, Buylist Price, Ratio, Per Booster), and surfaces Performance metrics via a dashboard.

**Supported franchises:** MTG · Pokémon · One Piece · Riftbound · LEGO

---

## What it does

- **Syncs** prices from CardMarket, CardKingdom, ABUGames, TCGPlayer, and BrickLink on a rolling schedule
- **Derives** Market Price (lowest sell listing), Buylist Price (highest buy offer), Ratio (seller margin %), and Per Booster price for sealed products
- **Tracks Performance** — daily, weekly, monthly, and yearly percentage changes per product
- **Surfaces a Product of the Day** — the top-performing product for a given date

---

## Monorepo layout

```
apps/
  api/   — Node.js + Express server (price sync, data queries)
  web/   — Next.js 15 dashboard (server actions → API)
packages/
  types/        — canonical domain types (single source of truth)
  api-contract/ — HTTP request/response shapes shared between api and web
```

---

## Tech stack

| Layer | Technology |
|---|---|
| Language | TypeScript throughout |
| API | Node.js, Express, Prisma ORM, PostgreSQL |
| Web | Next.js 15 (App Router), Tailwind CSS v4, Radix UI, Recharts |
| Scraping | Puppeteer Real Browser + Stealth plugin |
| Scheduling | node-cron inside `SyncSchedulerService` |
| Build | Turborepo |

---

## Getting started

### Prerequisites

- Node.js ≥ 20
- PostgreSQL database
- npm ≥ 10

### Install

```bash
npm install
```

### Configure

Copy the API env template and fill in your values:

```bash
cp apps/api/.env.example apps/api/.env
```

```
DATABASE_URL="postgresql://user:password@address:port/database_name?schema=public"
```

### Database setup

```bash
cd apps/api
npx prisma migrate deploy
```

### Run in development

```bash
# All apps in parallel (API + web)
npm run dev

# Or individually
cd apps/api && npm run dev
cd apps/web && npm run dev
```

### Build

```bash
npm run build
```

---

## API routes

| Method | Path | Description |
|---|---|---|
| `GET` | `/products` | List all products with today's Derived Prices and Performance |
| `GET` | `/products/:id` | Single product with full price history |
| `GET` | `/product-of-the-day` | Top-performing product for a given day |
| `GET` | `/sync` | Trigger a full Sync (filter by franchise / type / set / tags) |
| `GET` | `/sync/product/:id` | Trigger a Sync for a single product |
| `GET` | `/sync/set/:set` | Trigger a Sync for an entire Product Set |

---

## Architecture

The API follows a layered architecture with strict dependency direction: `transport → application → repository`.

| Layer | Location | Responsibility |
|---|---|---|
| Transport | `src/transport/http/` | Express routes, Zod request validation, CORS |
| Application | `src/application/` | Use cases, Sync orchestration, price aggregation |
| Repository | `src/repository/` | Port interfaces + Prisma/PostgreSQL implementations |
| Services | `src/services/` | Background services (`SyncSchedulerService` via node-cron) |

Repositories are injected into use cases via port interfaces — concrete Prisma implementations are wired in `initRepository()`.

---

## Price Sources

| Source | Type | Franchises |
|---|---|---|
| CardMarket | Sell listings | MTG, Pokémon, One Piece, Riftbound |
| CardKingdom | Buylist | MTG |
| ABUGames | Buylist | MTG |
| TCGPlayer | Sell listings | MTG |
| BrickLink | Sell listings | LEGO |
| FullSet | Sell listings | MTG |

All Raw Prices are stored in EUR after conversion where needed.

---

## Derived price computation

All derivation happens in `priceAggregator.ts` after Raw Prices are collected:

| Derived Price | Formula |
|---|---|
| Market Price | `min(cardmarket)` |
| Buylist Price | `max(cardkingdom, abugames)` |
| Ratio (cards) | `round((market / buylist) × 100) − 100` |
| Ratio (minifigures) | `round((market / bricklinkAverage) × 100) − 100` |
| Per Booster | `market / boosterCount` (sealed products only) |

---

## Sync schedule (UTC)

| Product type | Frequency | Times |
|---|---|---|
| Singles | Every 2 hours | :00 on even hours (0:00, 2:00 … 22:00) |
| Sealed products | Every 2 hours | :30 on odd hours (1:30, 3:30 … 23:30) |
| Minifigures | Every 15 minutes | (defined, not scheduled by default) |

---

## Domain vocabulary

| Term | Meaning |
|---|---|
| **Product** | A single tradeable item — card, sealed box, booster bundle, ETB, or LEGO minifigure |
| **Product Set** | A named release grouping Products (e.g. "Scarlet & Violet Base Set") |
| **Franchise** | The brand a Product belongs to (MTG, Pokémon, One Piece, Riftbound, LEGO) |
| **Price Source** | An external marketplace providing Raw Prices |
| **Raw Price** | A price fetched directly from a Price Source, in EUR |
| **Derived Price** | A price computed from Raw Prices (Market Price, Buylist Price, Ratio, Per Booster) |
| **Market Price** | The minimum sell listing across applicable Price Sources |
| **Buylist Price** | The maximum buy offer across buylist Price Sources |
| **Ratio** | The percentage spread between Market Price and Buylist Price — seller margin |
| **Performance** | Percentage change in Market or Buylist Price over a fixed period |
| **Sync** | The process of fetching Raw Prices and persisting Derived Prices |
