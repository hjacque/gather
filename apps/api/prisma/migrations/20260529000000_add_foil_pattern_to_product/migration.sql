-- CreateEnum
CREATE TYPE "FoilPattern" AS ENUM ('rareHolo', 'reverse', 'regularHolo');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN "foilPattern" "FoilPattern";

-- Backfill: promo rarity products get rareHolo
UPDATE "Product" SET "foilPattern" = 'rareHolo' WHERE "rarity" = 'promo';
