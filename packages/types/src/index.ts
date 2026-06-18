export const BLOCKS = [
  'scarlet_and_violet',
  'sword_and_shield',
  'sun_and_moon',
  'x_y',
  'ex',
  'web',
  'vs',
  'wotc',
  'e_series',
] as const;
export type Block = typeof BLOCKS[number];



export const PRICE_TYPES = [
  'marketSalePsa1',
  'marketSalePsa2',
  'marketSalePsa3',
  'marketSalePsa4',
  'marketSalePsa5',
  'marketSalePsa6',
  'marketSalePsa7',
  'marketSalePsa8',
  'marketSalePsa9',
  'marketSalePsa10',
] as const;
export type PriceType = typeof PRICE_TYPES[number];

export const REGIONS = ['japan', 'korea', 'taiwan_hong_kong'] as const;
export type Region = typeof REGIONS[number];


export const FOIL_PATTERNS = ['rareHolo', 'reverse', 'regularHolo'] as const;
export type FoilPattern = typeof FOIL_PATTERNS[number];

export const PLATFORMS = ['ebay', 'cardmarket'] as const;
export type Platform = typeof PLATFORMS[number];

export const SALE_STATUSES = ['pending', 'confirmed', 'invalid'] as const;
export type SaleStatus = typeof SALE_STATUSES[number];

export const VERIFICATION_STAGES = ['unverified', 'checked_7d', 'complete'] as const;
export type VerificationStage = typeof VERIFICATION_STAGES[number];

// Which scraper supplied a Sale's price. `terapeak` is eBay's authoritative sold
// price (lags ~3 days); `ebay_search` is the real-time public completed-listings
// search used to fill that fresh gap. Terapeak prices always win on conflict.
export const SALE_SOURCES = ['terapeak', 'ebay_search'] as const;
export type SaleSource = typeof SALE_SOURCES[number];

export type CollectionEntryEntity = {
  id: string;
  cardId: string;
  isOwned: boolean;
  isWanted: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type CardSetEntity = {
  id: string;
  name: string;
  code: string;
  releaseDate: Date;
  block: Block | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CardEntity = {
  id: string;
  name: string;
  foilPattern: FoilPattern | null;
  imageUrl: string | null;
  releaseDate: Date | null;
  cardSetId: string;
  cardMarketLink: string | null;
  psaLink: string | null;
  ebayLink: string | null;
  // Curated ebay.fr active Buy-It-Now search, EU item-location filtered
  // (Provenance = Union européenne). Drives the Listings Sync; null cards are
  // skipped. Distinct from `ebayLink`, which is the ebay.com *sold* search.
  ebayFrLink: string | null;
  number: string | null;
  note: string | null;
  tags: string[];
  regions: Region[];
  createdAt: Date;
  updatedAt: Date;
};

// An active marketplace ask (buyable now), as opposed to a Sale (realized
// transaction). One row per live listing seen by the last Listings Sync;
// listings that disappear are pruned by full per-card replacement on each sync.
export type ListingEntity = {
  id: string;
  cardId: string;
  platform: Platform;
  itemId: string;
  psaGrade: number;
  // Ask price in its original currency — an offer ceiling, not a realized price.
  price: number;
  currency: string;
  title: string;
  // Best Offer enabled: still buyable at `price`, but negotiable below it.
  isBestOffer: boolean;
  // eBay store slug of the seller, when the listing came from a store
  // (e.g. "psa"); null otherwise.
  seller: string | null;
  // Item-location country (e.g. "Allemagne"), verified to be an EU member state
  // at ingest for eBay asks. null for CardMarket (inherently EU) and for rows
  // eBay rendered without a location line.
  location: string | null;
  // When the last Listings Sync saw this listing live.
  seenAt: Date;
  // Set when the user flags this listing as not matching the card; invalidated
  // listings are excluded from reads (card panel + opportunities).
  invalidatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

// An ongoing eBay auction (EU-located) for a Card at a PSA Grade. Distinct from
// a ListingEntity (a buyable Buy-It-Now ask) and a SaleEntity (a realized
// transaction): an Auction carries a *current bid* — a moving asking price you
// cannot buy at, so it never feeds any Derived Price — and an immutable end
// time. Stored in its own table, never on Listing, so a bid is structurally
// incapable of reaching the buy-side minimum. Ephemeral: rows are full-replaced
// per Card on each Auction Sync and pruned once endTime passes. See ADR 0010.
export type AuctionEntity = {
  id: string;
  cardId: string;
  platform: Platform;
  itemId: string;
  psaGrade: number;
  // Current highest bid in its original currency. A moving asking price, not a
  // buyable one — never converted into a Derived Price.
  currentBid: number;
  currency: string;
  // Number of bids placed so far (0 when no one has bid yet).
  bidCount: number;
  // Absolute instant the auction ends, computed from eBay's relative "time
  // left" caption at scrape time. Immutable once captured; drives the live
  // countdown and the endTime > now read filter.
  endTime: Date;
  title: string;
  // eBay store slug of the seller (e.g. "psa"), or null for non-store sellers.
  seller: string | null;
  // Item-location country (e.g. "Allemagne"), verified to be an EU member state
  // at ingest. null when eBay rendered no location line.
  location: string | null;
  // When the current bid + bid count were last read (sync time, or a later
  // per-row refresh).
  bidCheckedAt: Date;
  // When the last Auction Sync saw this auction live.
  seenAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type SaleEntity = {
  id: string;
  cardId: string;
  platform: Platform;
  itemId: string;
  psaGrade: number;
  price: number;
  currency: string;
  title: string;
  // True when the sale came from a Best-Offer listing, where the scraped price
  // is the *asking* amount, not the realized one. Only the real-time eBay-search
  // source sets this; Terapeak rows are realized prices (always false). Pricing
  // excludes these until Terapeak upgrades the row. See ADR 0009.
  isBestOffer: boolean;
  // eBay store slug of the seller, when the listing came from a store
  // (e.g. "psa"); null otherwise.
  seller: string | null;
  status: SaleStatus;
  verificationStage: VerificationStage;
  // Which scraper supplied this Sale's price. See SaleSource.
  source: SaleSource;
  // Manual adjudication marker: null = unreviewed. Orthogonal to status and
  // verificationStage. See Sale Review in CONTEXT.md.
  reviewedAt: Date | null;
  soldAt: Date;
  createdAt: Date;
  updatedAt: Date;
};
