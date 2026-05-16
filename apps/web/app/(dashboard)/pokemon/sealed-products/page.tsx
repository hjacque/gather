import { GetProductFilter, getProducts } from '@/app/actions/getProducts';
import { PokemonSealedProductsTable } from '@/components/pokemon-sealed-products-table';

export default function PokemonSealedProductsPage() {
  const filter: GetProductFilter = {
    type: [
      'booster_box',
      'booster_bundle',
      'booster_box_18',
      'elite_trainer_box',
    ],
    franchise: 'pokemon',
  };
  const productsPromise = getProducts(filter);

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <PokemonSealedProductsTable
            dataPromise={productsPromise}
            pageSize={100}
            type
            set
            block
          />
        </div>
      </div>
    </div>
  );
}
