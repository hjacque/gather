-- Reinstate the Best-Offer flag on Sale. With the dual-source ingest (ADR 0008)
-- the real-time eBay-search source can surface a Best-Offer sale, whose scraped
-- price is the *asking* amount, not the realized one. The flag marks those rows
-- so pricing can exclude them until Terapeak upgrades the row with the true
-- accepted price. Terapeak rows are realized prices, so they default to false;
-- all existing rows predate the eBay-search source and are Terapeak-sourced.
-- See ADR 0009.
ALTER TABLE "Sale" ADD COLUMN "isBestOffer" BOOLEAN NOT NULL DEFAULT false;
