-- CardMarket asks now live in the Listing model, not as dated Price points.
-- Drop the cardmarketPsa* data and remove those values from the PriceType enum,
-- leaving only the marketSalePsa1-10 snapshots (written by the sales sync).

-- 1. Remove the orphaned cardmarket price rows.
DELETE FROM "Price" WHERE "type"::text LIKE 'cardmarketPsa%';

-- 2. Recreate the enum without the cardmarket values (Postgres can't drop enum
--    values in place).
ALTER TYPE "PriceType" RENAME TO "PriceType_old";

CREATE TYPE "PriceType" AS ENUM (
  'marketSalePsa1',
  'marketSalePsa2',
  'marketSalePsa3',
  'marketSalePsa4',
  'marketSalePsa5',
  'marketSalePsa6',
  'marketSalePsa7',
  'marketSalePsa8',
  'marketSalePsa9',
  'marketSalePsa10'
);

ALTER TABLE "Price"
  ALTER COLUMN "type" TYPE "PriceType" USING ("type"::text::"PriceType");

DROP TYPE "PriceType_old";
