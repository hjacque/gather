-- Widen the Sale uniqueness from (platform, itemId) to (platform, itemId, cardId)
-- so one eBay listing matched to two Cards becomes two independently-reviewable
-- Sales (invalidate the wrong-card attribution, keep the right one). Safe: the
-- old key was tighter, so no (platform, itemId, cardId) duplicates can exist.

-- DropIndex
DROP INDEX "Sale_platform_itemId_key";

-- CreateIndex
CREATE UNIQUE INDEX "Sale_platform_itemId_cardId_key" ON "Sale"("platform", "itemId", "cardId");
