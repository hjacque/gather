import { GetProductFilter, getProducts } from '@/app/actions/getProducts';
import { OnePieceSealedProductsTable } from '@/components/one-piece-sealed-products-table';

export default function OnePieceSealedProductsPage() {
  const filter: GetProductFilter = {
    type: ['booster_box', 'premium_booster_box', 'extra_booster_box'],
    franchise: 'one_piece',
  };
  const productsPromise = getProducts(filter);

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <OnePieceSealedProductsTable
            dataPromise={productsPromise}
            pageSize={100}
            type
            set
          />
        </div>
      </div>
    </div>
  );
}
