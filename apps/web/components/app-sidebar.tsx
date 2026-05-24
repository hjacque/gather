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
import { LucideIcon } from 'lucide-react';

const data = {
  navMain: [
    {
      title: 'Pokémon',
      url: '/pokemon',
      icon: PokemonIcon as LucideIcon,
      isActive: true,
      items: [
        {
          title: 'Japanese Promos',
          url: '/pokemon/japanese-promos',
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
