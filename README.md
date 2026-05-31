# Gather

A price aggregation tool for Pokémon exclusive promo cards (Japanese, Korean, and Taiwan/HK releases). Gather fetches Raw Prices from CardMarket across PSA grades, stores them, and surfaces derived data alongside PSA population counts and collection tracking.

---

## What it does

- **Syncs** CardMarket prices across PSA grades 1–10 for each card, on a rolling schedule
- **Tracks PSA population** — graded card counts per grade via PSA pop reports
- **Manages a collection** — mark cards as owned or on the wantlist

---

## Monorepo layout

```
apps/
  api/   — Node.js + Express server (price sync, data queries)
  web/   — Next.js 15 app (server actions → API)
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
| `GET` | `/cards` | List all cards with today's prices and PSA pop data |
| `GET` | `/cards/:cardid` | Single card with full price history |
| `PATCH` | `/cards/:cardid` | Update a card's note |
| `GET` | `/sync` | Trigger a full CardMarket sync (filter by set / tags) |
| `GET` | `/sync/card/:cardid/cardmarket` | Trigger a CardMarket sync for a single card |
| `GET` | `/sync/card/:cardid/psa` | Trigger a PSA pop report sync for a single card |
| `GET` | `/sync/set/:set` | Trigger a CardMarket sync for an entire Card Set |
| `GET` | `/sync/psa` | Trigger a full PSA pop report sync |
| `PUT` | `/collection/:cardid` | Upsert a collection entry (owned / wanted flags) |
| `DELETE` | `/collection/:cardid` | Remove a card from the collection |

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

| Source | Type |
|---|---|
| CardMarket | PSA grade sell listings (grades 1–10) |
| PSA | Pop report (graded card counts per grade) |

All Raw Prices are stored in EUR.

---

## Price types

Each card stores up to ten Raw Prices, one per PSA grade:

`cardmarketPsa1` through `cardmarketPsa10`

---

## Sync schedule (UTC)

| Target | Frequency | Time |
|---|---|---|
| All cards (CardMarket) | Every 2 hours | :00 on even hours (0:00, 2:00 … 22:00) |
| PSA pop reports | Daily | 03:00 |

---

## Domain vocabulary

| Term | Meaning |
|---|---|
| **Card** | A single Pokémon exclusive promo card being tracked |
| **Card Set** | A named release grouping Cards (e.g. "Scarlet & Violet Base Set") |
| **Region** | The release market of a Card — `japan`, `korea`, or `taiwan_hong_kong` |
| **Block** | A Pokémon era grouping Card Sets (e.g. `scarlet_and_violet`, `sword_and_shield`) |
| **Rarity** | Card rarity (`common`, `uncommon`, `rare`, `special_illustration_rare`, `promo`, etc.) |
| **Foil Pattern** | The card's foil treatment — `rareHolo`, `reverse`, or `regularHolo` |
| **Price Source** | An external marketplace providing Raw Prices |
| **Raw Price** | A price fetched directly from a Price Source, in EUR |
| **PSA Pop** | PSA population report data — graded card counts per grade for a card |
| **Collection Entry** | A record marking a card as owned and/or on the wantlist |
| **Sync** | The process of fetching Raw Prices from CardMarket and persisting them |
