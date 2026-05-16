import { GetProductFilter, getProducts } from '@/app/actions/getProducts';
import { MtgSealedProductsTable } from '@/components/mtg-sealed-products-table';

export default function MtgCollectorBoosterPage() {
  const filter: GetProductFilter = {
    type: ['collector_booster_box'],
    franchise: 'mtg',
  };
  const productsPromise = getProducts(filter);

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <MtgSealedProductsTable
            dataPromise={productsPromise}
            pageSize={100}
            set
          />
        </div>
      </div>
    </div>
  );
}
