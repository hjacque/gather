import type { GetCardsQuery as GetCardFilter } from '@gather/api-contract';
import { getCards } from '@/app/actions/getCards';
import { PokemonExclusivePromosTable } from '@/components/pokemon-exclusive-promos-table';

export default function PokemonExclusivePromosPage() {
  const filter: GetCardFilter = {};
  const cardsPromise = getCards(filter);

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <PokemonExclusivePromosTable
            dataPromise={cardsPromise}
            pageSize={250}
          />
        </div>
      </div>
    </div>
  );
}
