import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import MTGIcon from '@/components/mtg-icon';
import PokemonIcon from '@/components/pokemon-icon';
import OnePieceIcon from '@/components/one-piece-icon';
import RiftboundIcon from '@/components/riftbound-icon';

const sections = [
  {
    title: 'Magic: The Gathering',
    Icon: MTGIcon,
    items: [
      { title: 'Collector Booster Box', url: '/mtg/collector-booster-box' },
      { title: 'Old School Staples', url: '/mtg/oldschool-staples' },
      { title: 'Old School Basic Lands', url: '/mtg/basic-lands' },
      { title: 'Reserved List', url: '/mtg/reserved-list' },
      { title: 'CEDH', url: '/mtg/reserved-list-CEDH-staples' },
      { title: 'Power Nine', url: '/mtg/power-nine' },
      { title: 'Alpha', url: '/mtg/alpha' },
    ],
  },
  {
    title: 'Pokémon',
    Icon: PokemonIcon,
    items: [
      { title: 'Sealed Products', url: '/pokemon/sealed-products' },
      { title: 'Japanese Promos', url: '/pokemon/japanese-promos' },
    ],
  },
  {
    title: 'One Piece',
    Icon: OnePieceIcon,
    items: [
      { title: 'Sealed Products', url: '/one-piece/sealed-products' },
      { title: 'Singles', url: '/one-piece/singles' },
    ],
  },
  {
    title: 'Riftbound',
    Icon: RiftboundIcon,
    items: [{ title: 'Sealed Products', url: '/riftbound/sealed-products' }],
  },
];

export default function HomePage() {
  return (
    <div className="p-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {sections.map(({ title, Icon, items }) => (
          <Card key={title} className="gap-4">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Icon className="h-6 w-6 shrink-0" />
                <CardTitle className="text-base">{title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {items.map((item) => (
                  <li key={item.url}>
                    <Link
                      href={item.url}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {item.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
