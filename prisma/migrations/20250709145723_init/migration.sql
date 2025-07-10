-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('single', 'booster_box', 'collector_booster_box', 'booster_box_18', 'booster_bundle', 'elite_trainer_box');

-- CreateEnum
CREATE TYPE "Block" AS ENUM ('scarlet_and_violet', 'sword_and_shield');

-- CreateEnum
CREATE TYPE "Franchise" AS ENUM ('mtg', 'pokemon');

-- CreateEnum
CREATE TYPE "Rarity" AS ENUM ('common', 'uncommon', 'rare');

-- CreateEnum
CREATE TYPE "PriceType" AS ENUM ('cardmarket', 'pricecharting', 'cardkingdom', 'abugames', 'buylist', 'market', 'ratio', 'perBooster');

-- CreateEnum
CREATE TYPE "PerformancePeriodType" AS ENUM ('daily', 'weekly', 'monthly', 'yearly');

-- CreateEnum
CREATE TYPE "PerformanceType" AS ENUM ('market', 'buylist');

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "franchise" "Franchise" NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ProductType" NOT NULL,
    "boosterCount" INTEGER,
    "releaseDate" TIMESTAMP(3),
    "msrp" DOUBLE PRECISION,
    "setId" TEXT NOT NULL,
    "rarity" "Rarity",
    "cardMarketLink" TEXT NOT NULL,
    "priceChartingLink" TEXT NOT NULL,
    "cardkingdomBuyListLink" TEXT NOT NULL,
    "abugamesBuyListLink" TEXT NOT NULL,
    "starcitygamesBuyListLink" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductSet" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "franchise" "Franchise" NOT NULL,
    "releaseDate" TIMESTAMP(3),
    "block" "Block",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Price" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "value" DOUBLE PRECISION,
    "type" "PriceType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Price_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Performance" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "value" DOUBLE PRECISION,
    "periodType" "PerformancePeriodType" NOT NULL,
    "type" "PerformanceType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Performance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductSet_code_key" ON "ProductSet"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Price_productId_date_type_key" ON "Price"("productId", "date", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Performance_productId_date_type_key" ON "Performance"("productId", "date", "type");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_setId_fkey" FOREIGN KEY ("setId") REFERENCES "ProductSet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Price" ADD CONSTRAINT "Price_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Performance" ADD CONSTRAINT "Performance_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
