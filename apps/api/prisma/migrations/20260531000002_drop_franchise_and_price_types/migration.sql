-- Remove prices for dropped price types
DELETE FROM "Price" WHERE "type" IN ('cardmarket', 'buylist', 'market', 'ratio');

-- Rebuild PriceType enum without dropped types
ALTER TYPE "PriceType" RENAME TO "PriceType_old";
CREATE TYPE "PriceType" AS ENUM (
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

-- Drop franchise column from ProductSet
ALTER TABLE "ProductSet" DROP COLUMN IF EXISTS "franchise";

-- Drop old unique constraint including franchise and add new one
ALTER TABLE "ProductSet" DROP CONSTRAINT IF EXISTS "ProductSet_code_franchise_key";
ALTER TABLE "ProductSet" ADD CONSTRAINT "ProductSet_code_key" UNIQUE ("code");

-- Drop Franchise enum
DROP TYPE IF EXISTS "Franchise";
