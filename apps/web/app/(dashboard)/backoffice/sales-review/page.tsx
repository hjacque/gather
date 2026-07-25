import { getUnreviewedSales } from '@/app/actions/getUnreviewedSales';
import { SaleReviewQueue } from '@/components/sale-review-queue';

const PAGE_SIZE = 20;

export default async function SaleReviewPage() {
  const initial = await getUnreviewedSales(PAGE_SIZE);

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
          <div>
            <h1 className="text-lg font-semibold">Sale Review</h1>
            <p className="text-muted-foreground text-sm">
              Review scraped eBay sales: confirm or correct the grade, enrich
              Best-Offer prices, and flag bad listings.
            </p>
          </div>
          <SaleReviewQueue initial={initial} pageSize={PAGE_SIZE} />
        </div>
      </div>
    </div>
  );
}
