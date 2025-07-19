-- AlterEnum
ALTER TYPE "PriceType" ADD VALUE 'fullSet';

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "fullSetLink" TEXT;
