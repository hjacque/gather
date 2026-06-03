-- Merge cancelled into invalid: both mean the sale did not stick.
UPDATE "Sale" SET status = 'invalid' WHERE status = 'cancelled';

-- PostgreSQL does not support DROP VALUE on an enum; recreate without it.
-- Drop the column default first (it references the old type), then restore.
ALTER TABLE "Sale" ALTER COLUMN "status" DROP DEFAULT;
ALTER TYPE "SaleStatus" RENAME TO "SaleStatus_old";
CREATE TYPE "SaleStatus" AS ENUM ('pending', 'confirmed', 'invalid');
ALTER TABLE "Sale" ALTER COLUMN "status" TYPE "SaleStatus" USING "status"::text::"SaleStatus";
ALTER TABLE "Sale" ALTER COLUMN "status" SET DEFAULT 'pending'::"SaleStatus";
DROP TYPE "SaleStatus_old";
