import { GetProductFilter, getProducts } from '@/app/actions/getProducts';
import { PokemonJapanesePromosTable } from '@/components/pokemon-japanese-promos-table';

export default function PokemonJapanesePromosPage() {
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
          <PokemonJapanesePromosTable
            dataPromise={productsPromise}
            pageSize={100}
          />
        </div>
      </div>
    </div>
  );
}
