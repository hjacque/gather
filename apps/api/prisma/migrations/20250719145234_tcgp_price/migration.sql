-- AlterEnum
ALTER TYPE "PriceType" ADD VALUE 'tcgp';

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "tcgpLink" TEXT;
