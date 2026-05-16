'use client';

import { usePathname } from 'next/navigation';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

function toTitleCase(str: string) {
  if (str === 'mtg') {
    return 'Magic: The Gathering';
  }
  if (str === 'pokemon') {
    return 'Pokémon';
  }
  return str.replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function DynamicBreadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {segments.map((segment, index) => {
          const href = '/' + segments.slice(0, index + 1).join('/');
          const isLast = index === segments.length - 1;

          return (
            <div key={href} className="flex items-center">
              <BreadcrumbItem className={index !== 0 ? 'hidden md:block' : ''}>
                {isLast ? (
                  <BreadcrumbPage>{toTitleCase(segment)}</BreadcrumbPage>
                ) : (
                  <p>{toTitleCase(segment)}</p>
                )}
              </BreadcrumbItem>
              {!isLast && (
                <BreadcrumbSeparator
                  className={index !== 0 ? 'hidden md:block' : ''}
                />
              )}
            </div>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
