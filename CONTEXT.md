# Gather

A price aggregation and performance tracking platform for collectible trading cards and LEGO products. It scrapes prices from multiple external marketplaces and surfaces performance metrics to users via a dashboard.

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
