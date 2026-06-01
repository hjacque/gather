-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('ebay');

-- CreateEnum
CREATE TYPE "SaleStatus" AS ENUM ('pending', 'confirmed', 'cancelled');

-- CreateEnum
CREATE TYPE "VerificationStage" AS ENUM ('unverified', 'checked_7d', 'complete');

-- AlterTable
ALTER TABLE "Card" ADD COLUMN "ebayLink" TEXT;

-- CreateTable
CREATE TABLE "Sale" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "itemId" TEXT NOT NULL,
    "psaGrade" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "isBestOffer" BOOLEAN NOT NULL DEFAULT false,
    "status" "SaleStatus" NOT NULL DEFAULT 'pending',
    "verificationStage" "VerificationStage" NOT NULL DEFAULT 'unverified',
    "soldAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Sale_platform_itemId_key" ON "Sale"("platform", "itemId");

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;
