-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "psaLink" TEXT;

-- CreateTable
CREATE TABLE "PsaPopReport" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "grade1" INTEGER,
    "grade2" INTEGER,
    "grade3" INTEGER,
    "grade4" INTEGER,
    "grade5" INTEGER,
    "grade6" INTEGER,
    "grade7" INTEGER,
    "grade8" INTEGER,
    "grade9" INTEGER,
    "grade10" INTEGER,
    "syncedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PsaPopReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PsaPopReport_productId_key" ON "PsaPopReport"("productId");

-- AddForeignKey
ALTER TABLE "PsaPopReport" ADD CONSTRAINT "PsaPopReport_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
