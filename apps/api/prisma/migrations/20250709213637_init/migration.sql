/*
  Warnings:

  - A unique constraint covering the columns `[name,productSetId,type]` on the table `Product` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Product_name_productSetId_type_key" ON "Product"("name", "productSetId", "type");
