-- CreateEnum
CREATE TYPE "Region" AS ENUM ('japan', 'korea');

-- AlterTable: add regions column, migrate data, drop languages column
ALTER TABLE "Product" ADD COLUMN "regions" "Region"[] NOT NULL DEFAULT ARRAY[]::"Region"[];

UPDATE "Product"
SET "regions" = COALESCE(
  (SELECT array_agg(
    CASE l
      WHEN 'japanese' THEN 'japan'::"Region"
      WHEN 'korean'   THEN 'korea'::"Region"
    END
  )
  FROM unnest(languages::text[]) l),
  ARRAY[]::"Region"[]
);

ALTER TABLE "Product" DROP COLUMN "languages";

-- DropEnum
DROP TYPE "Language";
