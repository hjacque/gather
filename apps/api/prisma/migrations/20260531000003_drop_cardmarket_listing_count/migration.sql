-- Remove prices for dropped price type
DELETE FROM "Price" WHERE "type" = 'cardmarketListingCount';

-- Rebuild PriceType enum without cardmarketListingCount
ALTER TYPE "PriceType" RENAME TO "PriceType_old";
CREATE TYPE "PriceType" AS ENUM (
  'cardmarketPsa1',
  'cardmarketPsa2',
  'cardmarketPsa3',
  'cardmarketPsa4',
  'cardmarketPsa5',
  'cardmarketPsa6',
  'cardmarketPsa7',
  'cardmarketPsa8',
  'cardmarketPsa9',
  'cardmarketPsa10'
);
ALTER TABLE "Price" ALTER COLUMN "type" TYPE "PriceType" USING "type"::text::"PriceType";
DROP TYPE "PriceType_old";
