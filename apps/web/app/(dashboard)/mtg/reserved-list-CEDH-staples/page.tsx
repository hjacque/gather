import { GetProductFilter, getProducts } from '@/app/actions/getProducts';
import { SinglesTable } from '@/components/singles-table';

export default function MtgRLCEDHPage() {
  const filter: GetProductFilter = {
    type: 'single',
    franchise: 'mtg',
    tags: ['CEDH'],
  };
  const productsPromise = getProducts(filter);

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <SinglesTable
            dataPromise={productsPromise}
            pageSize={100}
            productSet
          />
        </div>
      </div>
    </div>
  );
}
