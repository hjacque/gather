import { GetProductFilter, getProducts } from '@/app/actions/getProducts';
import { RiftboundSealedProductsTable } from '@/components/riftbound-product-table';

export default function RiftboundSealedProductsPage() {
  const filter: GetProductFilter = {
    type: ['booster_box'],
    franchise: 'riftbound',
  };
  const productsPromise = getProducts(filter);

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <RiftboundSealedProductsTable
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
