import { GetProductFilter, getProducts } from '@/app/actions/getProducts';
import { OnePieceSinglesTable } from '@/components/one-piece-singles-table';

export default function OnePieceSinglesPage() {
  const filter: GetProductFilter = {
    type: 'single',
    franchise: 'one_piece',
  };
  const productsPromise = getProducts(filter);

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <OnePieceSinglesTable
            dataPromise={productsPromise}
            pageSize={100}
            productSet
          />
        </div>
      </div>
    </div>
  );
}
