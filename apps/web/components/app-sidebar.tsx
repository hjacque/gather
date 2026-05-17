'use client';

import * as React from 'react';
import { LucideIcon } from 'lucide-react';

import { NavMain } from '@/components/nav-main';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarRail,
} from '@/components/ui/sidebar';
import MTGIcon from './mtg-icon';
import PokemonIcon from './pokemon-icon';
import RiftboundIcon from './riftbound-icon';
import OnePieceIcon from './one-piece-icon';

const data: {
  navMain: {
    title: string;
    url: string;
    icon?: LucideIcon;
    isActive?: boolean;
    items?: {
      title: string;
      url: string;
    }[];
  }[];
} = {
  navMain: [
    // {
    //   title: 'Upcoming Releases',
    //   url: '/upcoming-releases',
    //   icon: CalendarSearchIcon,
    // },
    {
      title: 'Magic: The Gathering',
      url: '/mtg',
      icon: MTGIcon as LucideIcon,
      items: [
        {
          title: 'Collector Booster Box',
          url: '/mtg/collector-booster-box',
        },
        {
          title: 'Old School Staples',
          url: '/mtg/oldschool-staples',
        },
        {
          title: 'Old School Basic Lands',
          url: '/mtg/basic-lands',
        },
        {
          title: 'Reserved List',
          url: '/mtg/reserved-list',
        },
        {
          title: 'CEDH',
          url: '/mtg/reserved-list-CEDH-staples',
        },
        {
          title: 'Power Nine',
          url: '/mtg/power-nine',
        },
        {
          title: 'Alpha',
          url: '/mtg/alpha',
        },
      ],
    },
    {
      title: 'Pokémon',
      url: '/pokemon',
      icon: PokemonIcon as LucideIcon,
      items: [
        {
          title: 'Sealed Products',
          url: '/pokemon/sealed-products',
        },
        {
          title: 'Japanese Promos',
          url: '/pokemon/japanese-promos',
        },
      ],
    },
    {
      title: 'One Piece',
      url: '/one-piece',
      icon: OnePieceIcon as LucideIcon,
      items: [
        {
          title: 'Sealed Products',
          url: '/one-piece/sealed-products',
        },
        {
          title: 'Singles',
          url: '/one-piece/singles',
        },
      ],
    },
    {
      title: 'Riftbound',
      url: '/riftbound',
      icon: RiftboundIcon as LucideIcon,
      items: [
        {
          title: 'Sealed Products',
          url: '/riftbound/sealed-products',
        },
      ],
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar {...props}>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter></SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
