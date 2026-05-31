-- Drop columns from Product
ALTER TABLE "Product" DROP COLUMN IF EXISTS "type";
ALTER TABLE "Product" DROP COLUMN IF EXISTS "rarity";
ALTER TABLE "Product" DROP COLUMN IF EXISTS "msrp";
ALTER TABLE "Product" DROP COLUMN IF EXISTS "keyword";
ALTER TABLE "Product" DROP COLUMN IF EXISTS "blocked";

-- Drop the old unique constraint that included type
ALTER TABLE "Product" DROP CONSTRAINT IF EXISTS "Product_name_productSetId_type_releaseDate_number_key";

-- Add new unique constraint without type
ALTER TABLE "Product" ADD CONSTRAINT "Product_name_productSetId_releaseDate_number_key"
  UNIQUE ("name", "productSetId", "releaseDate", "number");

-- Drop ProductType enum (no longer referenced)
DROP TYPE IF EXISTS "ProductType";

-- Drop Rarity enum (no longer referenced)
DROP TYPE IF EXISTS "Rarity";
