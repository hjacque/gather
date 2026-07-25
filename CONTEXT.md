# Gather

A price and opportunity tracker for graded Pokémon cards. It scrapes CardMarket asks, eBay sold history, live eBay listings and auctions, and PSA population reports, then surfaces a per-grade Market Sale Price and a ranked list of buying opportunities through a dashboard.

## Monorepo layout

```
apps/
  api/   — Node.js + Express HTTP server (price sync, data queries)
  web/   — Next.js dashboard (server actions call the API)
packages/
  types/        — canonical domain types (CardEntity, SaleEntity, Region, PriceType, …)
  api-contract/ — typed request/response shapes shared between api and web
```

`packages/types` is the single source of truth for domain types.  
`packages/api-contract` re-exports from types and adds the HTTP contract shapes (`GetCardsResponse`, `GetCardResponse`, `GetOpportunitiesResponse`, etc.) — the web app imports from here, never from types directly.

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
| GET | `/cards` | List Cards (filter by `set`, `tags`, `region`) |
| GET | `/cards/:cardid` | Single Card with prices, sales, listings, pop report |
| PATCH | `/cards/:cardid` | Set or clear a Card's Note (`{ note }`, max 1000 chars) |
| GET | `/opportunities` | Top buying opportunities (scored, ranked, one grade per Card) |
| GET | `/sync` | Trigger a full Sync (filter by `set`/`tags`) |
| GET | `/sync/listings` | Same as `/sync` but skips the Sale Sync |
| GET | `/sync/set/:set` | Trigger a Sync for an entire Card Set |
| GET | `/sync/card/:cardid/cardmarket` | CardMarket Sync for a single Card |
| GET | `/sync/card/:cardid/psa` | PSA Sync for a single Card |
| GET | `/sync/psa` | PSA Pop Report Sync across all Cards |
| GET | `/sync/sales`, `/sync/sales/card/:cardid` | Sale Sync (batch / single Card) |
| GET | `/sync/listings/card/:cardid` | Listings Sync for a single Card |
| GET | `/sync/listings/:listingid` | Re-scrape one Listing's item page |
| GET | `/sync/auctions`, `/sync/auctions/card/:cardid` | Auction Sync (batch / single Card) |
| GET | `/auctions` | Live auctions (filter by `grade`, sort by `ending`/`bid`/`bids`) |
| GET | `/auctions/:auctionid/refresh-bid` | Re-read one auction's current bid |
| PATCH | `/auctions/:auctionid` | `invalidate` \| `invalidateByItem` \| `editGrade` |
| GET | `/sales/unreviewed` | Unreviewed Sales grouped by Card (keyset-paginated) |
| GET | `/sales/unreviewed/count` | Count of unreviewed Sales (for sidebar badge) |
| PATCH | `/sales/:saleid` | Review a Sale (`action: 'approve' \| 'invalidate'`, optional `psaGrade`/`price`) |
| PATCH | `/listings/:listingid` | `invalidate` \| `invalidateByItem` |
| PUT | `/collection/:cardid` | Upsert a Collection Entry (`{ isOwned, isWanted }`) |
| DELETE | `/collection/:cardid` | Remove a Collection Entry |

The API binds to `127.0.0.1` unless `API_HOST` says otherwise, and allows one
CORS origin (`WEB_ORIGIN`, default `http://localhost:42001`). There is no
authentication — every route above is open to whoever can reach the port.

## Tech stack

- **Language:** TypeScript throughout
- **API runtime:** Node.js, Express, Prisma ORM, PostgreSQL
- **Web:** Next.js (App Router), server actions call the API via `apiClient`
- **Build:** Turborepo monorepo
- **Scheduling:** node-cron inside `SyncSchedulerService`

## Language

**Card**:
A single graded-tradeable Pokémon card tracked by the platform, identified by
`(name, cardSetId, releaseDate, number)`. Carries the scrape entry points
(`cardMarketLink`, `psaLink`, `ebayLink`, `ebayFrLink`), a `regions` list, free
`tags`, and an optional Note.
_Avoid_: Product, item, article

**Card Set**:
A named release grouping Cards under a shared release date, keyed by a unique
`code` (e.g. `M-P` → "M-P Promotional"). A Card falls back to its Set's
`releaseDate` when it has none of its own.
_Avoid_: Product Set, expansion, collection

**Price Source**:
An external site a Sync scrapes. Today: CardMarket (graded asks), eBay (sold
history via Terapeak and the completed-listings search, plus live listings and
auctions), and PSA (pop reports).
_Avoid_: Marketplace, vendor, site, scraper

**Listing**:
An active marketplace ask — buyable now — for a Card at a PSA Grade, on eBay or
CardMarket. Each Listings Sync fully replaces a Card's rows, so vanished asks
prune themselves; a user-flagged row keeps its `invalidatedAt` across the
replacement by `itemId`. eBay rows carry a verified-EU `location`.
_Avoid_: Ask, offer, active sale

**Auction**:
An ongoing EU-located eBay auction for a Card at a PSA Grade, with a
`currentBid`, `bidCount`, and an absolute `endTime`. Deliberately a separate
table from Listing (ADR 0010) so a moving bid can never feed a price.
_Avoid_: Bid, live listing

**Collection Entry**:
The user's own relationship to a Card — `isOwned` and/or `isWanted`. At most one
per Card.
_Avoid_: Wishlist, inventory

**Sync**:
Fetching from external sources for one or more Cards and persisting the results.
Distinct forms: a **CardMarket Sync** (graded asks → Listings), a **Sale Sync**
(eBay sold history → Sales), a **Listings Sync**, an **Auction Sync**, and a
**PSA Sync** (pop report only).
_Avoid_: Scrape, update, refresh, import

## Price Sources

| Source | Class | Writes | Notes |
|---|---|---|---|
| CardMarket Graded | Live asks | `Listing` (`platform: cardmarket`) | Parses the description of every article on the Card's CardMarket page to read a PSA Grade; applies to any Card with a `cardMarketLink` |
| Terapeak | Sold history | `Sale` (`source: terapeak`) | eBay Seller Hub research — the realized transaction price, Best Offers included. Authoritative but lags ~3–4 days, and needs a signed-in session |
| eBay completed search | Sold history | `Sale` (`source: ebay_search`) | Real-time, fills the Terapeak lag. Shows Best Offers at the *asking* price, hence the `isBestOffer` flag |
| eBay active listings | Live asks | `Listing` (`platform: ebay`) | EU-located only; item pages re-scraped for seller and location |
| eBay auctions | Live bids | `Auction` | EU-located only; never feeds a price (ADR 0010) |
| PSA | Population | `PsaPopReport` | One flat row per Card, scraped from `psaLink` |

The only rows ever written to `Price` are the daily **Market Sale Price**
snapshots, typed `marketSalePsa1`…`marketSalePsa10`. There is no separate
buylist, ratio, or per-booster derivation — those belonged to an earlier
multi-franchise version of this codebase and no longer exist.

## Market Sale Price computation

`marketPrice.ts` owns the whole rule. Callers hand it raw Sales plus today's
USD→EUR rate and never pre-filter or pre-convert:

- A Sale is dropped if `status === 'invalid'`, if its currency is neither EUR
  nor USD, or if it is a Best Offer whose price is not yet realized
  (`isBestOffer && source !== 'terapeak'` — ADR 0011).
- Surviving Sales are grouped by PSA Grade and reduced to a **recency-weighted
  median**, each weighted by `0.5 ^ (ageDays / 30)`.
- Each grade also reports `sampleSize`, `newestSoldAt`, and `salesPerDay` over
  the span from its oldest Sale to now.
- Grades with no usable Sales simply have no entry — never a fabricated one.

`MarketSalePriceSnapshotService.recompute` replays that computation for each UTC
day in a range and writes the results through one chunked transaction. It runs
after a Sale Sync (today only) and after any Sale review or invalidation (from
the Sale's `soldAt` forward, since editing an old Sale moves every snapshot
after it).

## Sync schedule (UTC, via node-cron)

| Job | Frequency | Times |
|---|---|---|
| Full Sync (CardMarket asks, Sales, Listings) | Every 2 hours | :00 on even hours (0, 2, … 22) |
| Auction Sync | Every 2 hours | :15 on even hours (0:15, 2:15, … 22:15) |
| PSA Pop Report Sync | Daily | 03:00 |

## PSA Pop Report

**PSA Pop Report**:
A snapshot of the number of cards graded at each PSA grade (1–10) for a given Card, sourced by scraping the Card's `psaLink` (PSA pop report URL). Stored as one flat row per Card (`grade1`…`grade10` integer counts + `syncedAt`). Synced independently from price Syncs on a daily schedule via `/sync/psa`.
_Avoid_: PSA data, grading data, certification count

**PSA Grade**:
A numeric quality rating (1–10) assigned by PSA to a graded card. 10 is gem mint; 1 is poor.
_Avoid_: PSA score, condition score

**PSA Total**:
The sum of all PSA Grade counts (grades 1–10) for a Card — surfaced as a single column in the table. The full per-grade breakdown is only shown in the side panel.
_Avoid_: Total pop, total graded

**Card Number**:
An optional string identifier for a Card within its Card Set — e.g. `"SWSH001"` or `"001"` for exclusive promos. Used to disambiguate PSA pop report searches and displayed in the exclusive-promos table and side panel.
_Avoid_: Card number, set number, collector number

**Note**:
A free-text annotation attached to a single Card by the user. At most one Note per Card (stored as a nullable field on Card). Plain text, max 1000 characters. Displayed read-only at the bottom of the Card side panel; editable via a pen icon.
_Avoid_: Comment, annotation, description

**Sale**:
A single recorded transaction for a Card at a specific PSA Grade on a secondary marketplace. Carries a `platform` field (enum: `ebay`; others may be added later), the PSA grade (1–10), the price in its **original currency** plus a `currency` code, a `status` (`pending` → `confirmed` | `invalid`), a `source` (`terapeak` | `ebay_search`), and an `isBestOffer` flag. Prices are stored in original currency (never EUR-normalized at write time, because Sales are immutable history) and converted to EUR at read time using today's rate; only USD and EUR are supported, and Sales in other currencies are stored but excluded from EUR views. `isBestOffer` records that the sale was negotiated and is monotonic — once raised by an eBay-search sighting it is never cleared, while `source` tells you whether the price on the row is the realized one (ADR 0011). Carries a nullable `reviewedAt` timestamp (see Sale Review). Also stores the raw listing title (for debugging and re-classification), the `soldAt` date (drives the Base Range window and re-verification checkpoints), and `createdAt` (when first scraped). Identified globally by `(platform, itemId)` — the eBay item ID is globally unique, so a sale attaches to exactly one Card — and the item URL reconstructed from the item ID is revisited during re-verification.
_Avoid_: eBay sale, sold listing, transaction

**Sold Comp**:
Informal shorthand for a confirmed Sale used as an input to Base Range computation. A Sale is a Sold Comp once its status is `confirmed` and (for non-Best-Offer sales) its price is the actual transaction price.
_Avoid_: comp, sold price, sold listing

**Sale Sync**:
A scheduled job (separate from price Syncs and the Fair Value Sync) that sources a Card's Sales from **Terapeak** (eBay Seller Hub research — the authoritative sold record, ADR 0007), keyed off the same `ebayLink` query, and upserts them by platform item ID. Runs once daily. The batch is **two-phase** so a full all-Cards run survives eBay's short seller session: **Phase 1** (authenticated) fetches every Card's Terapeak sales and persists them as `pending`; **Phase 2** (no auth) verifies seller quality on each sale's eBay item page (auto-confirm trusted sellers), then folds in the re-verification pass over `pending` Sales at their 7-day / 30-day checkpoint and recomputes snapshots. Each run re-fetches the trailing 30-day window in full (idempotent upsert by item ID; reviewed Sales are frozen — see Sale Review — so the upsert no-ops their scraped fields). A lapsed session aborts Phase 1 loudly (`TerapeakAuthError`), still finalizes everything ingested, and logs the re-auth command. Skips Cards with no `ebayLink`, mirroring how price Syncs skip Cards with no `cardMarketLink`.
_Avoid_: eBay sync, sold listings sync, comp sync

**Trusted Seller**:
An eBay seller store whose listings are treated as unconditionally valid at scrape time — grade, price, and legitimacy are considered authoritative without manual review or re-verification. The trusted list is a hardcoded constant (`TRUSTED_EBAY_SELLERS` in `constants.ts`; first entry: `"psa"` — PSA's own eBay store). Because Terapeak carries no seller info (ADR 0007), seller identity is read from each sale's eBay **item page** during Phase 2 (`fetchSellerQuality`) by parsing the store-anchor href; non-store sellers have no seller slug and are not trusted. Sales from Trusted Sellers are persisted with `status = confirmed`, `verificationStage = complete`, and `reviewedAt = now`, and count toward Market Sale Price immediately (no review needed). On upsert, existing *unreviewed* Sales from a trusted seller are also upgraded to confirmed (natural backfill over the 30-day window); reviewed-and-frozen rows are untouched. See ADR 0006.
_Avoid_: verified seller, whitelisted seller, trusted store

**Sale Status**:
The lifecycle state of a Sale: `pending`, `confirmed`, or `invalid`. For ordinary Sales, re-verification navigates (via Puppeteer) to the Sale's item URL at two checkpoints — 7 days and 30 days after the Sale was first scraped — and reads the rendered page. A 404 (listing removed) or a live active listing (item relisted) both mean `invalid`. An ended/sold item page means the sale still looks valid. Crucially, a still-valid sale is **not** confirmed at the 7-day checkpoint — it stays `pending`; the 7-day check exists only to catch early cancellations. A Sale becomes `confirmed` only if it still looks valid at the 30-day checkpoint, because cancellations can occur throughout the 30-day window. Once a Sale reaches a terminal state (`confirmed` or `invalid`) it is no longer re-verified. A Sale that a human has reviewed is also never re-verified, whatever its status — otherwise a delisted item page would read as `not-found` at the next checkpoint and quietly overturn the approval. A separate `verificationStage` enum (`unverified` → `checked_7d` → `complete`) tracks which checkpoints have run so the daily job re-renders each Sale at most twice, never daily. **Exception — Trusted Sellers:** Sales from Trusted Seller stores skip the entire re-verification pipeline and are born `confirmed` / `verificationStage = complete` (see ADR 0006).
_Avoid_: sale state, verification status

**Sale Review**:
The manual adjudication of a scraped Sale by the admin, recorded as a nullable `reviewedAt` timestamp on the Sale (null = unreviewed). Orthogonal to both Sale Status (the automated `pending → confirmed | invalid` verification axis) and `verificationStage`: a Sale can be auto-`confirmed` yet unreviewed, or reviewed while still `pending`. Review serves two purposes: (a) **classification correctness** — confirm or correct that the Sale is the right Card at the right PSA Grade and is a genuine single-card sale (a bad listing is set to `invalid`), and (b) **price correction** — overriding a scraped price that is wrong. Setting `status = invalid` (from this page or the chart's moderation control) implies reviewed, so it also stamps `reviewedAt`. Best-Offer recovery is *not* a review task: an `ebay_search` best offer re-enters pricing automatically once Terapeak supplies the realized price (ADR 0011), and the queue shows the Best-Offer badge as display only. Skipped listings (rejected by the Listing Title Parser at scrape time) are never persisted and are out of scope for Review. **Trusted Seller Sales never enter the review queue** — they are persisted with `reviewedAt` already set and count toward Market Sale Price immediately (see Trusted Seller). The **review queue** (`/backoffice/sales-review`) is grouped by Card, scoped to `reviewedAt IS NULL AND status = 'pending'`, and **keyset-paginated** on `(MIN(soldAt), cardId)` so that reviewing a page — which removes those Cards from the set — cannot shift the window and skip the Cards behind it. Once a Sale is reviewed it is **frozen against re-scrape**: the Sale Sync upsert leaves `psaGrade` and `price` alone, including on the Terapeak-over-`ebay_search` upgrade path, which may still refresh the fields no human edits (title, `soldAt`, `currency`, `source`). Corrections overwrite scraped fields in place with no audit trail (see ADR 0005).
_Avoid_: moderation, verification, approval

**Market Sale Price**:
The price a Card actually sells for today at a specific PSA Grade: a recency-weighted median of that grade's eBay Sales in EUR, each Sale weighted by exponential age decay (30-day half-life). A Sale counts unless it is `invalid`, unconvertible, or a Best Offer whose price is not yet realized (`isBestOffer && source !== 'terapeak'` — ADR 0011): a buy-it-now price is the real price immediately, a negotiated one counts once Terapeak supplies what it actually sold for. Distinct from **Market Price** (lowest live listing) — it reflects realized eBay transactions, not asking prices. Computed on read in `marketPrice.ts`, which owns the full eligibility rule — callers pass raw Sales plus today's USD→EUR rate, never pre-filtering or pre-converting; unconvertible currencies are excluded and no automatic outlier rejection is applied (manual `invalid` moderation handles bad listings). Grades with no usable Sales have none. The PSA 10 figure carries a 7-day Performance delta, comparing it against the same median recomputed as of a week earlier.
_Avoid_: market price, sold price, average sale price

**Listing Deal**:
The percentage gap between a Card's lowest PSA 10 listing (its PSA Grade Price) and its PSA 10 Market Sale Price: `(listing − marketSale) / marketSale`. Negative means the listing sits below realized market value — a buying opportunity. Surfaced as a sortable table column so under-priced cards float to the top. A lightweight precursor to the full Opportunity Score.
_Avoid_: spread, deal score, opportunity

**Sale Frequency**:
How often a Card trades at a given PSA Grade — its Sales per day over the span from the oldest Sale to now, rendered in the largest readable unit (/day for liquid grades down to /yr for rarely-traded ones). Shown beside each grade's Market Sale Price as a liquidity cue. A simple precursor to Grade Liquidity Share.
_Avoid_: sale rate, volume, liquidity

## Relationships

- A **Card** belongs to exactly one **Card Set**
- A **Card** has at most one **Note** (nullable) and at most one **Collection Entry**
- A **Card** has zero or more **Listings** and **Auctions**, fully replaced on each Sync
- A **Card** has zero or more daily **Market Sale Price** snapshots, one per PSA Grade per day
- A **Card** has at most one **PSA Pop Report** (latest snapshot); a PSA Sync updates it via `/sync/psa`
- A **Card** has zero or more **Sales**, one per platform item ID; each Sale carries a PSA Grade and a Sale Status
- A **Sale** with status `confirmed` and `isBestOffer = false` is a **Sold Comp** usable in Base Range computation
- A **Card**'s **Market Sale Price** at a PSA Grade is the recency-weighted median of that grade's priceable **Sales**; absent when the grade has none
- A **Listing Deal** pairs a Card's PSA 10 **Market Sale Price** with its PSA 10 **PSA Grade Price** to flag under-priced listings

## Example dialogue

> **Dev:** "A sale shows up in both Terapeak and the eBay search with different prices. Which wins?"
> **Domain expert:** "Terapeak, always — it reports what the card actually sold for. The search only knows the asking price."

> **Dev:** "So does a Best Offer count toward Market Sale Price?"
> **Domain expert:** "Only once Terapeak has priced it. The flag says the sale was negotiated, which stays true forever; whether we can price it depends on whether the realized number has arrived."

> **Dev:** "Can a live auction's current bid move a Card's price?"
> **Domain expert:** "No. Auctions live in their own table precisely so a bid can never leak into a price."

## Fair Value Range

**Fair Value Range**:
A `(low, mid, high)` price band computed per Card per PSA Grade, derived from multiple signals (see below). Represents the range within which a card is fairly priced. Null for grades with insufficient sold history.
_Avoid_: fair price, price estimate, valuation

**Grade Fair Value**:
The `(low, mid, high)` triplet for a specific PSA Grade of a Card. Computed independently per grade — grades with insufficient sold comps produce a null Grade Fair Value rather than a fabricated one.
_Avoid_: graded fair value, PSA fair value

**Base Range**:
The initial `(low, mid, high)` derived from eBay sold prices only: `mid = median(sold comps)`, `low = mid − 1 stddev`, `high = mid + 1 stddev`. Foundation for the Fair Value Range before signal adjustments.
_Avoid_: initial range, raw range

**Sold Comp Window**:
The lookback period used to gather eBay sold prices for Base Range computation. Adaptive: uses 30 days if sufficient comps exist, expands to 90 days otherwise. Exact thresholds require data calibration.
_Avoid_: lookback window, time window, history window

**Grade Liquidity Share**:
The fraction of a Card's total eBay sold volume at a specific PSA Grade over the Sold Comp Window. High share = this grade is where the card actually trades. Low share = illiquid grade. Both relative share (within the card) and absolute floor count matter — a card with 2 total sales spread across grades is not liquid at any grade.
_Avoid_: grade volume, grade activity

**Opportunity Score**:
A numeric score (0–100) per Card per PSA Grade surfacing buying opportunities. Computed on the fly at read time (no stored table) by the pure ranking pipeline in `rankOpportunities.ts` (the use case only fetches inputs). Six weighted signals — Listing, Year, Population, Grade, Age, Premium — whose weights are tuned over time in `computeScore` (`opportunityScore.ts`); a CardMarket listing for the grade is required (a listing above Market Sale Price scores a penalty rather than being excluded). The page shows the top 20 entries by score, no floor. Per card, only the best-scoring grade is surfaced. Each signal and the overall score are returned as both a raw numeric value and a `SignalLevel` (`'green-strong' | 'yellow-light' | 'orange-light' | 'red-strong'`) computed by the backend so threshold logic lives in one place.
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
A composite demand-side weight per Card aggregating three sub-signals: Pokémon Popularity Score, Multi-Pokémon Card Signal, and Premium Card Symbol Signal. Supports a price premium and increases floor confidence in the Opportunity Score. Combination weights require empirical calibration.
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

A dedicated page surfacing the top buying opportunities across all tracked Cards for the day. Shows up to 20 Cards ranked by Opportunity Score descending, no score floor. One entry per Card (best-scoring grade only).

Each opportunity row shows: card image, card name + Card Set + PSA Grade, overall score badge, and five signal cells (Discount, 52-Week, Pop, Grade, Age). Each cell is coloured by its `SignalLevel` (`green-strong` → `yellow-light` → `orange-light` → `red-strong`). Clicking a row opens a side panel with the full card detail (chart, PSA pop breakdown, CardMarket link, card note). Arrow-key navigation moves between rows while the panel is open.

## Live Auctions

**Auction**:
A single ongoing eBay auction listing for a Card at a specific PSA Grade, located in the EU. A distinct concept from a **Listing** (a live Buy-It-Now ask) and from a **Sale** (a completed transaction): an Auction carries a **current bid** (a moving asking price, not a buyable price) and an immutable **end time**. Stored in its own `Auction` table — deliberately *not* on `Listing` — so an Auction's current bid is structurally incapable of feeding the buy-side minimum behind the Opportunity Score; the buy-side aggregation only ever reads `Listing`. Reuses the pure scrape helpers (Listing Title Parser for grade/Card attribution, `euLocation` for EU enforcement, the seller gate) but is sourced from an auctions-only eBay.fr search (`LH_Auction=1`, not `LH_BIN=1`). Surfaced on the cross-card **Live Auctions** page, never folded into any price. **Ephemeral, no history:** reads filter to `endTime > now` (a freshly-ended auction vanishes immediately); the sync does full per-card replacement (like Listings) and past-end rows are pruned. **User moderation:** from the feed's per-row kebab an admin can flag an Auction as not matching its Card (sets `invalidatedAt` — dropped from the feed) or correct its scraped PSA grade (sets `gradeEditedAt`); both edits are carried forward by itemId across the full-replacement sync so a re-sync that still sees the item keeps the moderation (the corrected grade is not re-overwritten by the re-parsed one). The realized outcome of an auction that sells is captured by the existing Sale pipeline via Terapeak, so the `Auction` table keeps no closed-auction history and is not reconciled to `Sale` (that would revive the item-id join ADR 0007 abandoned, and add a status machine the plain feed doesn't need).
_Avoid_: auction listing, bid, live listing

**Live Auctions page**:
A cross-card global feed of all ongoing EU Auctions across tracked Cards — a plain browsable list (no opportunity scoring, no pricing impact). Lives under the dashboard alongside the Opportunities and Pokémon pages. Default sort is **ending-soonest**; each row shows the Card (image + name + Card Set), PSA Grade, current bid (with its "as of" timestamp and a per-row refresh control), bid count, time left (computed client-side from the immutable end time, so the countdown is always accurate even when the stored current bid is stale), EU country, and a link out to the auction. Controls: a **PSA grade filter** and **sort toggles** (re-sort by current bid or bid count, not only ending-soonest). No Card Set filter. The feed only ever contains auctions with active bidding — the Auction Sync stores bid auctions only (zero-bid auctions are never ingested), so there is no zero-bid filter. Freshness is **hybrid**: a scheduled sync stores each Auction's durable shell, and a lazy "refresh bids" action re-scrapes the current bid + bid count for the visible rows on demand.
_Avoid_: auctions list, live listings page

**Auction Sync**:
The scheduled discovery job for Auctions, a sibling of the Listings Sync (`SyncAuctionsUsecase`, its own routes and browser session, same node-cron cadence). Walks each Card's auctions-only eBay.fr search (link derived on the fly from `ebayLink` by `auctionsLinkFromEbayLink` — `LH_Auction=1`, `_sop=44` = eBay's "ending soonest + with bids" — never a stored column). `_sop=44` is both the feed's default ending-soonest order and a **server-side zero-bid filter** (a live probe of ebay.fr returned 0 zero-bid rows under it), so the sync only ever sees auctions with active bidding — no per-row bid parsing is used to exclude them. It classifies grade/Card with the Listing Title Parser, enforces EU provenance per row, applies the same per-item seller-quality gate as the Listings Sync (zero-feedback sellers dropped, read off each candidate's eBay item page), and does full per-card replacement into `Auction`. Captures each row's **end time** as an absolute instant computed from eBay's relative "time left" caption at scrape time (so it is immutable thereafter). Because discovery already visits each surviving candidate's eBay item page for the seller gate, it captures an **initial current bid + bid count** there too (stamping `bidCheckedAt`), so every Auction lands with a bid as of the last sync; the lazy per-row refresh only updates that value later off the same item page (`EbayItemPageSource`). Bid refresh is **per-row and on demand only**: each row carries a `bidCheckedAt` "as of" timestamp and its own refresh control that re-scrapes just that one Auction's item page (mirroring the existing per-row `/sync/listings/:listingid` action) — the page never auto-scrapes bids on load.
_Avoid_: auction scrape, auctions refresh

## Flagged ambiguities

- "price" alone is ambiguous — always qualify as Market Sale Price, a Listing price, an Auction's current bid, or a specific source name (e.g. "the CardMarket ask").
- The **lowest live Listing** (an asking price, computed on read by `mergeListingOffers`) and the **Market Sale Price** (recency-weighted median of realized Sales) are different concepts. Never conflate them. Older notes call the former "Market Price"; that term is retired, along with the whole Raw Price / Derived Price / Buylist vocabulary from the pre-Pokémon codebase.
- "liquidity" without qualification is ambiguous — use Grade Liquidity Share (relative, per grade) or specify absolute sold count.
