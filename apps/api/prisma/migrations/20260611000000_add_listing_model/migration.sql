-- CreateTable
CREATE TABLE "Listing" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "itemId" TEXT NOT NULL,
    "psaGrade" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "isBestOffer" BOOLEAN NOT NULL DEFAULT false,
    "seller" TEXT,
    "seenAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Listing_platform_itemId_cardId_key" ON "Listing"("platform", "itemId", "cardId");

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;
