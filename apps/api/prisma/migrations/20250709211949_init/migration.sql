/*
  Warnings:

  - The values [pricecharting] on the enum `PriceType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `franchise` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `priceChartingLink` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `releaseDate` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `setId` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `starcitygamesBuyListLink` on the `Product` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[productId,date,periodType,type]` on the table `Performance` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[code,franchise]` on the table `ProductSet` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `productSetId` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Made the column `releaseDate` on table `ProductSet` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "PriceType_new" AS ENUM ('cardmarket', 'cardkingdom', 'abugames', 'buylist', 'market', 'ratio', 'perBooster');
ALTER TABLE "Price" ALTER COLUMN "type" TYPE "PriceType_new" USING ("type"::text::"PriceType_new");
ALTER TYPE "PriceType" RENAME TO "PriceType_old";
ALTER TYPE "PriceType_new" RENAME TO "PriceType";
DROP TYPE "PriceType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_setId_fkey";

-- DropIndex
DROP INDEX "Performance_productId_date_type_key";

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "franchise",
DROP COLUMN "priceChartingLink",
DROP COLUMN "releaseDate",
DROP COLUMN "setId",
DROP COLUMN "starcitygamesBuyListLink",
ADD COLUMN     "productSetId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "ProductSet" ALTER COLUMN "releaseDate" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Performance_productId_date_periodType_type_key" ON "Performance"("productId", "date", "periodType", "type");

-- CreateIndex
CREATE UNIQUE INDEX "ProductSet_code_franchise_key" ON "ProductSet"("code", "franchise");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_productSetId_fkey" FOREIGN KEY ("productSetId") REFERENCES "ProductSet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
