import { GetProductFilter, getProducts } from '@/app/actions/getProducts';
import { PokemonExclusivePromosTable } from '@/components/pokemon-exclusive-promos-table';

export default function PokemonExclusivePromosPage() {
  const filter: GetProductFilter = {
    type: 'single',
    franchise: 'pokemon',
    rarity: 'promo',
  };
  const productsPromise = getProducts(filter);

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <PokemonExclusivePromosTable
            dataPromise={productsPromise}
            pageSize={250}
          />
        </div>
      </div>
    </div>
  );
}
