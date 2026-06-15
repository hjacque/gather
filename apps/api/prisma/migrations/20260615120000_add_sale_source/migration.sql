-- CreateEnum
CREATE TYPE "SaleSource" AS ENUM ('terapeak', 'ebay_search');

-- Tag every Sale with the scraper that supplied its price. Existing rows predate
-- the dual-source ingest and fall inside Terapeak's authoritative window, so
-- default them to 'terapeak'; the real-time public-search source only ever
-- writes fresh-gap rows and never targets these. The Sale upsert refuses to let
-- an 'ebay_search' price overwrite a 'terapeak' one. See ADR 0008.
ALTER TABLE "Sale" ADD COLUMN "source" "SaleSource" NOT NULL DEFAULT 'terapeak';
