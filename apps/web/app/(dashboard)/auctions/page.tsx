import { getAuctions } from '@/app/actions/getAuctions';
import { AuctionsList } from '@/components/auctions-list';

export default async function AuctionsPage() {
  const auctions = await getAuctions();

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
          <h1 className="text-lg font-semibold">Live auctions</h1>
          <AuctionsList auctions={auctions} />
        </div>
      </div>
    </div>
  );
}
