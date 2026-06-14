-- Retire the legacy Best-Offer flag on Sale. Terapeak is the sales source and
-- reports the realized price, so no Sale is ever a Best-Offer placeholder; the
-- column and its market-price gate are dead. Listing.isBestOffer is unaffected.
ALTER TABLE "Sale" DROP COLUMN "isBestOffer";
