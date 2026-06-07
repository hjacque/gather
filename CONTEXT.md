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
| GET | `/sync/product/:id/cardmarket` | Trigger a CardMarket Sync for a single Product |
| GET | `/sync/product/:id/psa` | Trigger a PSA Pop Report Sync for a single Product |
| GET | `/sync/set/:set` | Trigger a Sync for an entire Product Set |
| GET | `/sales/unreviewed` | List unreviewed Sales (grouped by Card, paginated) |
| GET | `/sales/unreviewed/count` | Count of unreviewed Sales (for sidebar badge) |
| PATCH | `/sales/:id` | Review a Sale (`action: 'approve' \| 'invalidate'`, optional `psaGrade`/`price`) |
| GET | `/opportunities` | Top buying opportunities (scored, ranked, one grade per Card) |

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
The process of fetching data from external sources for one or more Products and persisting the results. Comes in two targeted forms at the single-Product level: a **CardMarket Sync** (fetches Raw Prices from the applicable CardMarket Price Source only) and a **PSA Sync** (refreshes the PSA Pop Report only).
_Avoid_: Scrape, update, refresh, import

**Grade Spread**:
A dimensionless ratio between the Market Sale Prices of two adjacent PSA Grades for the same Card on a given date (e.g. `marketSalePrice(10) / marketSalePrice(9)`). Stored as its own entity (not a Raw Price — it carries no currency). Computed in the Fair Value Sync from already-stored eBay sold history; absent when either grade has no usable Market Sale Price. Used as an input signal (`gradeSpreadSignal`) in the Opportunity Score to validate cross-grade coherence of Fair Value Ranges.
_Avoid_: grade premium, grade ratio, price spread

**PSA Grade Price**:
The lowest CardMarket listing price for a Product at a specific PSA Grade, scraped by parsing the description field of every listing on the Product's CardMarket page (all conditions, no filter). Stored as a Raw Price with type `cardmarketPsa1`…`cardmarketPsa10`. Only tracked for Products that have a `psaLink`.
_Avoid_: Graded price, PSA market price, grade listing price

## Price Sources

| Source | Type | Franchises | Notes |
|---|---|---|---|
| CardMarket | Sell listings | MTG, Pokémon, One Piece, Riftbound | Lowest listing → Market Price |
| CardMarket Graded | Sell listings | Pokémon | Lowest listing per PSA Grade → PSA Grade Price; only for products with `psaLink` |
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

## PSA Pop Report

**PSA Pop Report**:
A snapshot of the number of cards graded at each PSA grade (1–10) for a given Product, sourced by scraping the Product's `psaLink` (PSA pop report URL). Stored as one flat row per Product (`grade1`…`grade10` integer counts + `syncedAt`). Synced independently from price Syncs on a daily schedule via `/sync/psa`.
_Avoid_: PSA data, grading data, certification count

**PSA Grade**:
A numeric quality rating (1–10) assigned by PSA to a graded card. 10 is gem mint; 1 is poor.
_Avoid_: PSA score, condition score

**PSA Total**:
The sum of all PSA Grade counts (grades 1–10) for a Product — surfaced as a single column in the table. The full per-grade breakdown is only shown in the side panel.
_Avoid_: Total pop, total graded

**Product Number**:
An optional string identifier for a Product within its Product Set — e.g. `"SWSH001"` or `"001"` for exclusive promos. Used to disambiguate PSA pop report searches and displayed in the exclusive-promos table and side panel.
_Avoid_: Card number, set number, collector number

**Note**:
A free-text annotation attached to a single Product by the user. At most one Note per Product (stored as a nullable field on Product). Plain text, max 1000 characters. Displayed read-only at the bottom of the Product side panel; editable via a pen icon.
_Avoid_: Comment, annotation, description

**Sale**:
A single recorded transaction for a Card at a specific PSA Grade on a secondary marketplace. Carries a `platform` field (enum: `ebay`; others may be added later), the PSA grade (1–10), the price in its **original currency** plus a `currency` code, a `status` (`pending` → `confirmed` | `cancelled`), and an `isBestOffer` flag. Prices are stored in original currency (never EUR-normalized at write time, because Sales are immutable history) and converted to EUR at read time using today's rate; only USD and EUR are supported initially, and Sales in other currencies are stored but excluded from EUR views until conversion exists. When `isBestOffer` is true the stored price is the listed price, not the actual accepted offer; the real transaction price is unknown until Sale Review resolves it. Carries a nullable `reviewedAt` timestamp (see Sale Review). Also stores the raw listing title (for debugging and re-classification), the `soldAt` date (drives the Base Range window and re-verification checkpoints), and `createdAt` (when first scraped). Identified globally by `(platform, itemId)` — the eBay item ID is globally unique, so a sale attaches to exactly one Card — and the item URL reconstructed from the item ID is revisited during re-verification.
_Avoid_: eBay sale, sold listing, transaction

**Sold Comp**:
Informal shorthand for a confirmed Sale used as an input to Base Range computation. A Sale is a Sold Comp once its status is `confirmed` and (for non-Best-Offer sales) its price is the actual transaction price.
_Avoid_: comp, sold price, sold listing

**Sale Sync**:
A scheduled job (separate from price Syncs and the Fair Value Sync) that scrapes a Card's completed-listing search results from its `ebayLink` and upserts the resulting Sales by platform item ID. Runs once daily. Each run re-fetches the trailing 30-day window in full (idempotent upsert by item ID; reviewed Sales are frozen — see Sale Review — so the upsert no-ops their scraped fields), then folds in a re-verification pass over `pending` Sales that have reached their 7-day or 30-day checkpoint. Skips Cards with no `ebayLink`, mirroring how price Syncs skip Cards with no `cardMarketLink`.
_Avoid_: eBay sync, sold listings sync, comp sync

**Trusted Seller**:
An eBay seller store whose listings are treated as unconditionally valid at scrape time — grade, price, and legitimacy are considered authoritative without manual review or re-verification. The trusted list is a hardcoded constant (`TRUSTED_EBAY_SELLERS` in `constants.ts`; first entry: `"psa"` — PSA's own eBay store). Seller identity is detected by parsing the store-anchor href on each result row; non-store sellers have no seller slug and are not trusted. Sales from Trusted Sellers are persisted with `status = confirmed`, `verificationStage = complete`, and `reviewedAt = now`, and their Best-Offer prices are included in Market Sale Price immediately (no review needed). On upsert, existing *unreviewed* Sales from a trusted seller are also upgraded to confirmed (natural backfill over the 30-day window); reviewed-and-frozen rows are untouched. See ADR 0006.
_Avoid_: verified seller, whitelisted seller, trusted store

**Sale Status**:
The lifecycle state of a Sale: `pending`, `confirmed`, or `cancelled`. For ordinary Sales, re-verification navigates (via Puppeteer) to the Sale's item URL at two checkpoints — 7 days and 30 days after the Sale was first scraped — and reads the rendered page. A 404 (listing removed) or a live active listing (item relisted) both mean `cancelled`. An ended/sold item page means the sale still looks valid. Crucially, a still-valid sale is **not** confirmed at the 7-day checkpoint — it stays `pending`; the 7-day check exists only to catch early cancellations. A Sale becomes `confirmed` only if it still looks valid at the 30-day checkpoint, because cancellations can occur throughout the 30-day window. Once a Sale reaches a terminal state (`confirmed` or `cancelled`) it is no longer re-verified. A separate `verificationStage` enum (`unverified` → `checked_7d` → `complete`) tracks which checkpoints have run so the daily job re-renders each Sale at most twice, never daily. **Exception — Trusted Sellers:** Sales from Trusted Seller stores skip the entire re-verification pipeline and are born `confirmed` / `verificationStage = complete` (see ADR 0006).
_Avoid_: sale state, verification status

**Sale Review**:
The manual adjudication of a scraped Sale by the admin, recorded as a nullable `reviewedAt` timestamp on the Sale (null = unreviewed). Orthogonal to both Sale Status (the automated `pending → confirmed | cancelled` verification axis) and `verificationStage`: a Sale can be auto-`confirmed` yet unreviewed, or reviewed while still `pending`. Review serves two purposes: (a) **classification correctness** — confirm or correct that the Sale is the right Card at the right PSA Grade and is a genuine single-card sale (a bad listing is set to `invalid`), and (b) **Best-Offer price enrichment** — entering the true accepted price for a Best-Offer Sale, whose scraped price is only the listing price. Setting `status = invalid` (from this page or the chart's moderation control) implies reviewed, so it also stamps `reviewedAt`. A Best-Offer whose true price can't be determined is left unreviewed (it stays excluded from Market Sale Price). Skipped listings (rejected by the Listing Title Parser at scrape time) are never persisted and are out of scope for Review. **Trusted Seller Sales never enter the review queue** — they are persisted with `reviewedAt` already set and count toward Market Sale Price immediately (see Trusted Seller). The **review queue** (`/backoffice/sales-review`) is grouped by Card, ordered by oldest unreviewed Sale first, paginated by Card, and scoped to `reviewedAt IS NULL AND status NOT IN ('cancelled', 'invalid')` — i.e. only `pending`/`confirmed` Sales whose review can still affect Market Sale Price. Once a Sale is reviewed it is **frozen against re-scrape**: the Sale Sync upsert no-ops its scraped fields, though re-verification still applies to a reviewed-but-`pending` Sale. Corrections overwrite scraped fields in place with no audit trail (see ADR 0005).
_Avoid_: moderation, verification, approval

**Market Sale Price**:
The price a Card actually sells for today at a specific PSA Grade: a recency-weighted median of that grade's eBay Sales in EUR, each Sale weighted by exponential age decay (30-day half-life). A Sale counts only if `!isBestOffer || reviewedAt != null`: non-Best-Offer sales count immediately (a buy-it-now price is the real price), but a Best-Offer counts only once Sale Review has enriched it with the true accepted price. `cancelled`/`invalid` are always excluded. Distinct from **Market Price** (lowest live listing) — it reflects realized eBay transactions, not asking prices. Computed on read in `marketPrice.ts`; unconvertible currencies are excluded and no automatic outlier rejection is applied (manual `invalid` moderation handles bad listings). Grades with no usable Sales have none. The PSA 10 figure carries a 7-day Performance delta, comparing it against the same median recomputed as of a week earlier.
_Avoid_: market price, sold price, average sale price

**Listing Deal**:
The percentage gap between a Card's lowest PSA 10 listing (its PSA Grade Price) and its PSA 10 Market Sale Price: `(listing − marketSale) / marketSale`. Negative means the listing sits below realized market value — a buying opportunity. Surfaced as a sortable table column so under-priced cards float to the top. A lightweight precursor to the full Opportunity Score.
_Avoid_: spread, deal score, opportunity

**Sale Frequency**:
How often a Card trades at a given PSA Grade — its Sales per day over the span from the oldest Sale to now, rendered in the largest readable unit (/day for liquid grades down to /yr for rarely-traded ones). Shown beside each grade's Market Sale Price as a liquidity cue. A simple precursor to Grade Liquidity Share.
_Avoid_: sale rate, volume, liquidity

## Relationships

- A **Product** belongs to exactly one **Product Set**
- A **Product** has at most one **Note** (nullable)
- A **Product** has zero or more **Raw Prices**, one per **Price Source** per day
- **Derived Prices** are computed from a Product's **Raw Prices** for a given day
- **Performance** is computed from a Product's **Market Price** or **Buylist Price** across two dates
- A **Sync** produces **Raw Prices** for each applicable **Price Source**, then derives **Derived Prices** and **Performance**
- A **Product** has at most one **PSA Pop Report** (latest snapshot); a PSA Sync updates it via `/sync/psa`
- A **Card** has zero or more **Sales**, one per platform item ID; each Sale carries a PSA Grade and a Sale Status
- A **Sale** with status `confirmed` and `isBestOffer = false` is a **Sold Comp** usable in Base Range computation
- A **Card**'s **Market Sale Price** at a PSA Grade is the recency-weighted median of that grade's non-cancelled/invalid **Sales**; absent when the grade has no Sales
- A **Listing Deal** pairs a Card's PSA 10 **Market Sale Price** with its PSA 10 **PSA Grade Price** to flag under-priced listings

## Example dialogue

> **Dev:** "When we add a new Price Source, do we need to change the Market Price calculation?"
> **Domain expert:** "No — Market Price is always the minimum across whichever Raw Prices exist. A new Price Source just adds another candidate to that minimum."

> **Dev:** "Is the Ratio a Raw Price or a Derived Price?"
> **Domain expert:** "Derived — it's computed from Market Price and Buylist Price, never scraped directly."

## Fair Value Range

**Fair Value Range**:
A `(low, mid, high)` price band computed per Product per PSA Grade, derived from multiple signals (see below). Represents the range within which a card is fairly priced. Null for grades with insufficient sold history.
_Avoid_: fair price, price estimate, valuation

**Grade Fair Value**:
The `(low, mid, high)` triplet for a specific PSA Grade of a Product. Computed independently per grade — grades with insufficient sold comps produce a null Grade Fair Value rather than a fabricated one.
_Avoid_: graded fair value, PSA fair value

**Base Range**:
The initial `(low, mid, high)` derived from eBay sold prices only: `mid = median(sold comps)`, `low = mid − 1 stddev`, `high = mid + 1 stddev`. Foundation for the Fair Value Range before signal adjustments.
_Avoid_: initial range, raw range

**Sold Comp Window**:
The lookback period used to gather eBay sold prices for Base Range computation. Adaptive: uses 30 days if sufficient comps exist, expands to 90 days otherwise. Exact thresholds require data calibration.
_Avoid_: lookback window, time window, history window

**Grade Liquidity Share**:
The fraction of a Product's total eBay sold volume at a specific PSA Grade over the Sold Comp Window. High share = this grade is where the card actually trades. Low share = illiquid grade. Both relative share (within the card) and absolute floor count matter — a card with 2 total sales spread across grades is not liquid at any grade.
_Avoid_: grade volume, grade activity

**Opportunity Score**:
A numeric score (0–100) per Card per PSA Grade surfacing buying opportunities. Computed on the fly at read time (no stored table). Five signals with fixed weights: Listing Signal (25%), Year Signal (5%), Population Signal (25%), Grade Signal (20%), Age Signal (25%). A CardMarket listing below Market Sale Price is required — grades without one are excluded. Floor: 40/100 to appear on the Opportunities page, with a guaranteed minimum of 5 entries (top-scoring regardless of floor). Per card, only the best-scoring grade is surfaced. Each signal and the overall score are returned as both a raw numeric value and a `SignalLevel` (`'green-strong' | 'yellow-light' | 'orange-light' | 'red-strong'`) computed by the backend so threshold logic lives in one place.
_Avoid_: deal score, buy score, opportunity index

**Listing Signal**:
`sqrt(clamp((marketSale − listing) / marketSale, 0, 1))`. Square root amplifies small discounts: a 1% listing discount scores ~10% rather than ~1% on a linear scale. A CardMarket listing is required and must be strictly below Market Sale Price — grades with no listing or with listing ≥ market are excluded entirely.
_Avoid_: listing deal signal, price gap signal

**Year Signal**:
`1 − (marketSale − yearLow) / (yearHigh − yearLow)`. 1 at 52-week low (maximum opportunity), 0 at 52-week high. Zero when insufficient price history exists or yearHigh = yearLow. Derived from stored `marketSalePsa{grade}` Price history.
_Avoid_: 52-week signal, trend signal

**Age Signal**:
Normalized release date across the **full card collection** (not only candidates with a qualifying listing that day), older → higher (0–1). Pre-computed before the listing gate so the scale is stable regardless of which cards have a listing today.
_Avoid_: vintage signal, release signal

**Population Signal**:
Normalized inverse of `log(psaReport.grade{N} + 1)` across the **full card collection** (all card-grade PSA pairs), lower absolute count → higher (0–1). Log scale compresses extreme outliers (4 vs 25000). Pre-computed before the listing gate for the same stability reason as Age Signal. Zero when PSA Pop Report is absent.
_Avoid_: rarity signal, scarcity signal

**Grade Signal**:
`1 − (popsAtOrAbove / total)` where `popsAtOrAbove` = sum of PSA pop counts at the scored grade and all grades above it. Encodes both grade quality (higher grade = fewer popsAtOrAbove) and card-level mint difficulty without a separate multiplier. A card with 3 copies at PSA 7 or above out of 10 total scores 0.70. Zero when PSA Pop Report is absent.
_Avoid_: gem rate signal, grade rarity signal

**Relative Pop Velocity**:
How fast a card's PSA population at a given grade is growing compared to cards from the same era (±3 years from release date). High relative velocity = above-average supply pressure = compresses Opportunity Score. Always ≥ 0 (PSA populations can only grow).
_Avoid_: pop growth rate, grading velocity, absolute pop velocity

**Pokémon Popularity Score**:
The inherent demand signal for a given Pokémon entity, independent of any specific card. Popular Pokémon (e.g. Charizard, Pikachu, Gengar) command stronger price floors and more resilient demand across all cards featuring them. Derived from grading volume, price premium vs. comparable cards, eBay sold frequency, and external popularity data (Pokémon GO usage, competitive play, fan rankings). Stored on the `Pokemon` entity.
_Avoid_: Pokémon score, popularity rating

**Multi-Pokémon Card Signal**:
A bonus demand signal for cards depicting more than one Pokémon. Cards featuring multiple Pokémon (e.g. tag team cards, duo promos) attract collectors of each Pokémon depicted and tend to command higher demand than single-Pokémon cards of comparable rarity. Derived from the count of distinct Pokémon depicted on the card.
_Avoid_: multi-Pokémon bonus, tag team bonus

**Premium Card Symbol Signal**:
A bonus demand signal for cards carrying exclusive symbols or markings — indicators of provenance, rarity tier, or event exclusivity that drive collector premiums beyond what rarity alone explains. Examples: Pokémon Center badge, tournament/championship stamps, regional exclusive markings. Boolean or tiered flag per card.
_Avoid_: symbol bonus, badge signal, promo stamp signal

**Card Popularity Score**:
A composite demand-side weight per Product aggregating three sub-signals: Pokémon Popularity Score, Multi-Pokémon Card Signal, and Premium Card Symbol Signal. Supports a price premium and increases floor confidence in the Opportunity Score. Combination weights require empirical calibration.
_Avoid_: card popularity, popularity score, demand score

**Listing Depth**:
The number and distribution of current CardMarket sell listings above the Market Price floor. A deep listing stack confirms the floor is real; a single isolated listing at the floor price is an unreliable signal.
_Avoid_: listing count, supply depth

**Listing Staleness**:
A measure of how long a CardMarket listing has been active without selling. Stale listings at low prices do not reflect real market willingness to transact and are discounted in the Opportunity Score.
_Avoid_: listing age, stale price

**Fair Value Sync**:
A scheduled computation job (separate from price Syncs) that reads already-stored signal data — primarily eBay sold history from #84's Sync — and writes `FairValueRange` and `OpportunityScore` rows. Makes no external API calls; purely a computation pass over stored data. Runs nightly or triggered after the eBay Sync completes.
_Avoid_: fair value scrape, fair value update, fair value refresh

## Fair Value signals

| Signal | Source issue | Role |
|---|---|---|
| eBay sold prices | #84 | Base Range (primary — required) |
| Relative Pop Velocity | #86 | Supply pressure; high relative velocity compresses score |
| Card Popularity Score | #99 (sub-signals: #89, #97, #98) | Demand floor confidence; popular cards support a price premium |
| 52-week high/low | #92 | Context; buying near 52-week low amplifies opportunity |
| Listing Depth | #93 | Floor quality; shallow depth discounts the Market Price floor |
| PSA grade price spread | #94 | Cross-grade coherence; validates range relative to adjacent grades |
| Listing Staleness | #95 | Price reliability; stale floor listings are discounted |

## MVP roadmap — Opportunity Score

Milestone: **MVP: Opportunity Score** — minimum feature set to surface fair value ranges and buying opportunities for PSA graded Pokémon cards.

### Phase 1 — Data foundation `high`

| Issue | What | Why first |
|---|---|---|
| #84 | eBay sold listings | Gates Base Range, Grade Liquidity, and the entire Opportunity Score |

### Phase 2 — Fair value core `high`

Ships together once #84 data exists. #92–#95 are fast because they reuse existing data or scraping infrastructure.

| Issue | What | Notes |
|---|---|---|
| #91 | Fair Value Range + Opportunity Score + all UI surfaces | Schema, FairValueSyncService, table column, side panel, opportunities page |
| #92 | 52-week high / low | Fully derivable from existing price history |
| #93 | CardMarket listing depth | Same scraping pass as current CardMarket source |
| #94 | PSA grade price spread | Derived from existing PSA Grade Prices |
| #95 | CardMarket listing staleness | Needs HTML verification first |

### Phase 3 — Signal enrichment `mid`

Meaningful signals, but each requires #84 data to have accumulated before thresholds can be calibrated. Ship after Phase 2.

| Issue | What | Notes |
|---|---|---|
| #96 | Grade Liquidity Share | Requires per-grade eBay sold volume distribution |
| #86 | Relative Pop Velocity | Requires PSA pop snapshot history (architectural change) |

### Post-MVP — Popularity signal `low`

Long dependency chain with manual data-entry work (card ↔ Pokémon associations). Adds meaningful demand-side signal once in place.

| Issue | What |
|---|---|
| #87 | Pokémon entity (Pokédex seed) |
| #88 | Pokémon ↔ card associations |
| #101 | Research: external Pokémon popularity data sources |
| #89 | Pokémon popularity score |
| #97 | Multi-Pokémon card signal |
| #98 | Premium card symbol signal |
| #99 | Card popularity score (aggregator) |
| #100 | Filter and browse products by Pokémon |

## Fair Value dependency tree

```
#91 fair value range / opportunity score
├── #84  eBay sold listings                          ← gates Base Range and Grade Liquidity
├── #86  PSA pop velocity tracking                   → popVelocitySignal
├── #92  52-week high / low per product              → weekHighLowSignal
├── #93  CardMarket listing depth                    → listingDepthSignal
├── #94  PSA grade price spread                      → gradeSpreadSignal
├── #95  CardMarket listing staleness                → stalenessSignal
├── #96  grade liquidity share                       → liquiditySignal
│   └── #84  eBay sold listings
└── #99  card popularity score                       → popularitySignal
    ├── #89  Pokémon popularity score
    │   ├── #87  Pokémon entity
    │   ├── #88  Pokémon ↔ card associations
    │   │   └── #87  Pokémon entity
    │   └── #101 research: external Pokémon popularity data sources
    ├── #97  multi-Pokémon card signal
    │   └── #88  Pokémon ↔ card associations
    └── #98  premium card symbol signal
```

Adjacent issues (enabled by the same foundation, not blocking #91):

```
#87  Pokémon entity
└── #88  Pokémon ↔ card associations
    └── #100 filter and browse products by Pokémon
```

## Opportunities page

A dedicated page surfacing the top buying opportunities across all tracked Cards for the day. Shows 5–10 Cards ranked by Opportunity Score descending: up to 10 entries with score ≥ 40/100, but always at least 5 (top-scoring regardless of floor). One entry per Card (best-scoring grade only).

Each opportunity row shows: card image, card name + Product Set + PSA Grade, overall score badge, and five signal cells (Discount, 52-Week, Pop, Grade, Age). Each cell is coloured by its `SignalLevel` (`green-strong` → `yellow-light` → `orange-light` → `red-strong`). Clicking a row opens a side panel with the full card detail (chart, PSA pop breakdown, CardMarket link, card note). Arrow-key navigation moves between rows while the panel is open.

## Flagged ambiguities

- "price" alone is ambiguous — always qualify as Raw Price, Derived Price, Market Price, Buylist Price, or a specific source name (e.g. "the CardMarket price").
- **Market Price** (lowest live listing — `min(cardmarket)`) and **Market Sale Price** (recency-weighted median of eBay Sold Comps) are different concepts: the first is an asking price, the second a realized one. Never conflate them.
- "liquidity" without qualification is ambiguous — use Grade Liquidity Share (relative, per grade) or specify absolute sold count.
