'use client';

import * as React from 'react';

import { NavMain } from '@/components/nav-main';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarRail,
} from '@/components/ui/sidebar';
import PokemonIcon from './pokemon-icon';
import { LucideIcon, Settings2 } from 'lucide-react';
import { getUnreviewedCount } from '@/app/actions/getUnreviewedCount';

const buildNav = (unreviewedCount: number) => [
  {
    title: 'Pokémon',
    url: '/pokemon',
    icon: PokemonIcon as LucideIcon,
    isActive: true,
    items: [
      {
        title: 'Opportunities',
        url: '/opportunities',
      },
      {
        title: 'Live Auctions',
        url: '/auctions',
      },
      {
        title: 'Exclusive Promos',
        url: '/pokemon/exclusive-promos',
      },
    ],
  },
  {
    title: 'Backoffice',
    url: '/backoffice',
    icon: Settings2,
    items: [
      {
        title: 'Sale Review',
        url: '/backoffice/sales-review',
        badge: unreviewedCount || undefined,
      },
    ],
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [unreviewedCount, setUnreviewedCount] = React.useState(0);

  React.useEffect(() => {
    const refresh = () =>
      getUnreviewedCount()
        .then((r) => setUnreviewedCount(r.count))
        .catch(() => {});
    refresh();
    window.addEventListener('sale-reviewed', refresh);
    return () => window.removeEventListener('sale-reviewed', refresh);
  }, []);

  return (
    <Sidebar {...props}>
      <SidebarContent>
        <NavMain items={buildNav(unreviewedCount)} />
      </SidebarContent>
      <SidebarFooter></SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
