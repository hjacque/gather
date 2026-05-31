-- Drop product link columns
ALTER TABLE "Product" DROP COLUMN IF EXISTS "cardkingdomBuyListLink";
ALTER TABLE "Product" DROP COLUMN IF EXISTS "abugamesBuyListLink";
ALTER TABLE "Product" DROP COLUMN IF EXISTS "fullSetLink";
ALTER TABLE "Product" DROP COLUMN IF EXISTS "tcgpLink";
ALTER TABLE "Product" DROP COLUMN IF EXISTS "bricklinkLink";
ALTER TABLE "Product" DROP COLUMN IF EXISTS "boosterCount";

-- Remove prices for dropped price types
DELETE FROM "Price" WHERE "type" IN ('cardkingdom', 'abugames', 'perBooster', 'fullSet', 'tcgp', 'bricklink', 'bricklinkAverage');

-- Remove products of dropped types (non-singles)
DELETE FROM "Price" WHERE "productId" IN (SELECT "id" FROM "Product" WHERE "type" != 'single');
DELETE FROM "PsaPopReport" WHERE "productId" IN (SELECT "id" FROM "Product" WHERE "type" != 'single');
DELETE FROM "CollectionEntry" WHERE "productId" IN (SELECT "id" FROM "Product" WHERE "type" != 'single');
DELETE FROM "Product" WHERE "type" != 'single';

-- Remove non-single values from ProductType enum
ALTER TABLE "Product" ALTER COLUMN "type" DROP DEFAULT;
ALTER TYPE "ProductType" RENAME TO "ProductType_old";
CREATE TYPE "ProductType" AS ENUM ('single');
ALTER TABLE "Product" ALTER COLUMN "type" TYPE "ProductType" USING "type"::text::"ProductType";
ALTER TABLE "Product" ALTER COLUMN "type" SET DEFAULT 'single'::"ProductType";
DROP TYPE "ProductType_old";

-- Remove dropped price types from PriceType enum
ALTER TYPE "PriceType" RENAME TO "PriceType_old";
CREATE TYPE "PriceType" AS ENUM (
  'cardmarket',
  'buylist',
  'market',
  'ratio',
  'cardmarketListingCount',
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
