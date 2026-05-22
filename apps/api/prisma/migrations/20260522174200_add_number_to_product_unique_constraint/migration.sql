-- DropIndex
DROP INDEX "Product_name_productSetId_type_releaseDate_key";

-- CreateIndex
CREATE UNIQUE INDEX "Product_name_productSetId_type_releaseDate_number_key" ON "Product"("name", "productSetId", "type", "releaseDate", "number");
