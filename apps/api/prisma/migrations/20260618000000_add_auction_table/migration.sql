-- CreateTable
CREATE TABLE "Auction" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "itemId" TEXT NOT NULL,
    "psaGrade" INTEGER NOT NULL,
    "currentBid" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "bidCount" INTEGER NOT NULL DEFAULT 0,
    "endTime" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "seller" TEXT,
    "location" TEXT,
    "bidCheckedAt" TIMESTAMP(3) NOT NULL,
    "seenAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Auction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Auction_endTime_idx" ON "Auction"("endTime");

-- CreateIndex
CREATE UNIQUE INDEX "Auction_platform_itemId_cardId_key" ON "Auction"("platform", "itemId", "cardId");

-- AddForeignKey
ALTER TABLE "Auction" ADD CONSTRAINT "Auction_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;
