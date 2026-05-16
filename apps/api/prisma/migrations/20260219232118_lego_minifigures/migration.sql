-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Block" ADD VALUE 'ex';
ALTER TYPE "Block" ADD VALUE 'e_series';
ALTER TYPE "Block" ADD VALUE 'web';
ALTER TYPE "Block" ADD VALUE 'vs';
ALTER TYPE "Block" ADD VALUE 'wotc';

-- AlterEnum
ALTER TYPE "Franchise" ADD VALUE 'lego';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PriceType" ADD VALUE 'bricklink';
ALTER TYPE "PriceType" ADD VALUE 'bricklinkAverage';

-- AlterEnum
ALTER TYPE "ProductType" ADD VALUE 'minifigure';

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "bricklinkLink" TEXT;
