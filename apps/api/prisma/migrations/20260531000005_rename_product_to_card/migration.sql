-- Rename ProductSet → CardSet
ALTER TABLE "ProductSet" RENAME TO "CardSet";

-- Rename Product → Card
ALTER TABLE "Product" RENAME TO "Card";

-- Rename productSetId → cardSetId in Card
ALTER TABLE "Card" RENAME COLUMN "productSetId" TO "cardSetId";

-- Rename productId → cardId in CollectionEntry
ALTER TABLE "CollectionEntry" RENAME COLUMN "productId" TO "cardId";

-- Rename productId → cardId in Price
ALTER TABLE "Price" RENAME COLUMN "productId" TO "cardId";

-- Rename productId → cardId in PsaPopReport
ALTER TABLE "PsaPopReport" RENAME COLUMN "productId" TO "cardId";
