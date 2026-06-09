-- The seller trust/activity cache backed the eBay store-page scrape, which has
-- been removed: seller trust + activity are now derived from each search-result
-- row's seller line. The table is no longer read or written.
DROP TABLE "Seller";
