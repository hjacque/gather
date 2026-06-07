import { getOpportunities } from '@/app/actions/getOpportunities';
import { OpportunitiesList } from '@/components/opportunities-list';

export default async function OpportunitiesPage() {
  const opportunities = await getOpportunities();

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
          <h1 className="text-lg font-semibold">Top collecting opportunities</h1>
          <OpportunitiesList opportunities={opportunities} />
        </div>
      </div>
    </div>
  );
}
