'use client';

import * as React from 'react';
import { ArrowUpDown, ExternalLink, ShoppingCart, Store } from 'lucide-react';
import { useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';

import { useIsMobile } from '@/hooks/use-mobile';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from './ui/sheet';
import { getProduct } from '@/app/actions/getProduct';
import { ProductNoteSection } from '@/components/product-note-section';
import { ProductCardImage } from '@/components/product-card-image';
import type { GetProductResponse } from '@/app/actions/getProduct';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card';
import { PsaGradePriceChart } from '@/components/psa-grade-price-chart';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import type { GetProductsResponseItem } from '@/app/actions/getProducts';
import { ProductTable, RowActionsCell } from './product-table';

const columns: ColumnDef<GetProductsResponseItem>[] = [
  {
    id: 'image',
    size: 40,
    header: '',
    cell: ({ row }) => <ImageCell item={row.original} />,
  },
  {
    accessorKey: 'name',
    size: 300,
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
        Name <ArrowUpDown />
      </Button>
    ),
    cell: ({ row }) => <TableCellViewer item={row.original} />,
    enableHiding: false,
    enableSorting: true,
  },
  {
    accessorKey: 'releaseDate',
    size: 110,
    header: ({ column }) => (
      <div className="flex justify-center">
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Release <ArrowUpDown />
        </Button>
      </div>
    ),
    cell: ({ row }) => {
      const date = row.original.releaseDate;
      return (
        <div className="text-muted-foreground text-sm whitespace-nowrap text-center">
          {date
            ? new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
            : '-'}
        </div>
      );
    },
    enableSorting: true,
  },
  {
    id: 'set',
    size: 110,
    accessorFn: (row) => row.productSet.name,
    filterFn: (row, _columnId, filterValue: string[]) => {
      if (!filterValue || filterValue.length === 0) return true;
      return filterValue.includes(row.original.productSet.name);
    },
    header: ({ column }) => (
      <div className="flex justify-center">
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Set <ArrowUpDown />
        </Button>
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex justify-center">
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className="text-muted-foreground px-1.5 max-w-full truncate overflow-hidden whitespace-nowrap"
            >
              {row.original.productSet.code}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>{row.original.productSet.name}</p>
          </TooltipContent>
        </Tooltip>
      </div>
    ),
  },
  {
    id: 'number',
    size: 110,
    accessorFn: (row) => (row.number != null ? parseInt(row.number, 10) : null),
    sortUndefined: 'last',
    header: ({ column }) => (
      <div className="flex justify-center">
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Number <ArrowUpDown />
        </Button>
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-muted-foreground text-sm text-center">
        {row.original.number ?? ''}
      </div>
    ),
    enableSorting: true,
  },
  {
    accessorKey: 'buy',
    size: 110,
    header: '',
    cell: ({ row }) => (
      <div className="flex justify-center">
        <a href={`${row.original.cardMarketLink}`} target="_blank" rel="noreferrer">
          <Button variant="buy" size="buySize">
            Buy
          </Button>
        </a>
      </div>
    ),
  },
  {
    id: 'cardmarketPsa9',
    size: 110,
    accessorFn: (row) => row.cardmarketPsa9 ?? null,
    sortUndefined: 'last',
    header: ({ column }) => (
      <div className="flex justify-center">
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          PSA 9 <ArrowUpDown />
        </Button>
      </div>
    ),
    cell: ({ row }) => {
      const today = row.original.cardmarketPsa9;
      const yesterday = row.original.cardmarketPsa9Yesterday;
      const color = today != null && yesterday != null
        ? today > yesterday ? 'text-green-500' : today < yesterday ? 'text-red-500' : undefined
        : undefined;
      return (
        <div className={`text-center tabular-nums text-sm ${color ?? ''}`}>
          {today != null ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(today) : ''}
        </div>
      );
    },
    enableSorting: true,
  },
  {
    id: 'cardmarketPsa10',
    size: 110,
    accessorFn: (row) => row.cardmarketPsa10 ?? null,
    sortUndefined: 'last',
    header: ({ column }) => (
      <div className="flex justify-center">
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          PSA 10 <ArrowUpDown />
        </Button>
      </div>
    ),
    cell: ({ row }) => {
      const today = row.original.cardmarketPsa10;
      const yesterday = row.original.cardmarketPsa10Yesterday;
      const color = today != null && yesterday != null
        ? today > yesterday ? 'text-green-500' : today < yesterday ? 'text-red-500' : undefined
        : undefined;
      return (
        <div className={`text-center tabular-nums text-sm ${color ?? ''}`}>
          {today != null ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(today) : ''}
        </div>
      );
    },
    enableSorting: true,
  },
  {
    id: 'psaTotal',
    size: 110,
    accessorFn: (row) => row.psaTotal ?? null,
    header: ({ column }) => (
      <div className="flex justify-center">
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          PSA Pop <ArrowUpDown />
        </Button>
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-center tabular-nums">
        {row.original.psaTotal != null ? row.original.psaTotal.toLocaleString() : '—'}
      </div>
    ),
    enableSorting: true,
  },
  {
    id: 'regions',
    accessorFn: (row) => row.regions,
    filterFn: (row, _columnId, filterValue: string[]) => {
      if (!filterValue || filterValue.length === 0) return true;
      return filterValue.some((r) => row.original.regions?.includes(r));
    },
    enableHiding: true,
    size: 0,
    header: () => null,
    cell: () => null,
  },
  {
    id: 'actions',
    size: 52,
    cell: ({ row }) => <RowActionsCell row={row} />,
  },
];

export function PokemonExclusivePromosTable({
  dataPromise,
  pageSize = 10,
}: {
  dataPromise: Promise<GetProductsResponseItem[]>;
  pageSize?: number;
}) {
  return (
    <ProductTable
      dataPromise={dataPromise}
      columns={columns}
      pageSize={pageSize}
      defaultSorting={[{ id: 'releaseDate', desc: false }, { id: 'number', desc: false }]}
      filters={(data, table) => {
        const setDateMap = new Map<string, number>();
        const setCountMap = new Map<string, number>();
        for (const d of data) {
          setCountMap.set(d.productSet.name, (setCountMap.get(d.productSet.name) ?? 0) + 1);
          if (!d.releaseDate) continue;
          const ts = new Date(d.releaseDate).getTime();
          const existing = setDateMap.get(d.productSet.name);
          if (existing === undefined || ts < existing) {
            setDateMap.set(d.productSet.name, ts);
          }
        }
        const sets = Array.from(new Set(data.map((d) => d.productSet.name))).sort((a, b) => {
          const da = setDateMap.get(a) ?? Infinity;
          const db = setDateMap.get(b) ?? Infinity;
          return da !== db ? da - db : a.localeCompare(b);
        });
        const selected = (table.getColumn('set')?.getFilterValue() as string[]) ?? [];
        const toggle = (setName: string) => {
          const next = selected.includes(setName)
            ? selected.filter((s) => s !== setName)
            : [...selected, setName];
          table.getColumn('set')?.setFilterValue(next.length ? next : undefined);
        };
        const label =
          selected.length === 0
            ? 'All sets'
            : selected.length === 1
              ? selected[0]
              : `${selected.length} sets`;

        const allRegions = ['japan', 'korea', 'taiwan_hong_kong'] as const;
        const regionDisplayName: Record<string, string> = {
          japan: 'Japan',
          korea: 'Korea',
          taiwan_hong_kong: 'Taiwan & Hong Kong',
        };
        const selectedRegions = (table.getColumn('regions')?.getFilterValue() as string[]) ?? [];
        const toggleRegion = (region: string) => {
          const next = selectedRegions.includes(region)
            ? selectedRegions.filter((r) => r !== region)
            : [...selectedRegions, region];
          table.getColumn('regions')?.setFilterValue(next.length ? next : undefined);
        };
        const regionLabel =
          selectedRegions.length === 0
            ? 'All regions'
            : selectedRegions.length === 1
              ? regionDisplayName[selectedRegions[0]]
              : `${selectedRegions.length} regions`;

        return (
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="w-48 justify-between font-normal">
                  <span className="truncate">{label}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2" align="start">
                <div className="flex flex-col gap-1 max-h-72 overflow-y-auto">
                  {sets.map((s) => (
                    <label
                      key={s}
                      className="flex items-center gap-2 rounded px-2 py-1.5 text-sm cursor-pointer hover:bg-accent"
                    >
                      <Checkbox
                        checked={selected.includes(s)}
                        onCheckedChange={() => toggle(s)}
                      />
                      {`${s} (${setCountMap.get(s)})`}
                    </label>
                  ))}
                </div>
                {selected.length > 0 && (
                  <div className="mt-2 border-t pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => table.getColumn('set')?.setFilterValue(undefined)}
                    >
                      Clear
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="w-48 justify-between font-normal">
                  <span className="truncate">{regionLabel}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2" align="start">
                <div className="flex flex-col gap-1">
                  {allRegions.map((region) => (
                    <label
                      key={region}
                      className="flex items-center gap-2 rounded px-2 py-1.5 text-sm cursor-pointer hover:bg-accent"
                    >
                      <Checkbox
                        checked={selectedRegions.includes(region)}
                        onCheckedChange={() => toggleRegion(region)}
                      />
                      {regionDisplayName[region]}
                    </label>
                  ))}
                </div>
                {selectedRegions.length > 0 && (
                  <div className="mt-2 border-t pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => table.getColumn('regions')?.setFilterValue(undefined)}
                    >
                      Clear
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>
        );
      }}
    />
  );
}

function useProductPanel(item: GetProductsResponseItem) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [product, setProduct] = useState<GetProductResponse | null>(null);

  const fetchProduct = async () => {
    try {
      const data = await getProduct(item.id);
      setProduct(data);
    } catch (err) {
      console.error('Failed to load product detail', err);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (next) fetchProduct();
    setOpen(next);
  };

  const psaReport = product?.psaPopReport ?? null;
  const grades = psaReport
    ? [
        { grade: 1, count: psaReport.grade1 },
        { grade: 2, count: psaReport.grade2 },
        { grade: 3, count: psaReport.grade3 },
        { grade: 4, count: psaReport.grade4 },
        { grade: 5, count: psaReport.grade5 },
        { grade: 6, count: psaReport.grade6 },
        { grade: 7, count: psaReport.grade7 },
        { grade: 8, count: psaReport.grade8 },
        { grade: 9, count: psaReport.grade9 },
        { grade: 10, count: psaReport.grade10 },
      ]
    : null;

  const panel = (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        className={`p-10 gap-6 ${!isMobile ? 'w-1/2' : ''} sm:w-[1400px] sm:max-w-[1400px]`}
      >
        <SheetHeader>
          <SheetTitle>{item.name}</SheetTitle>
          <SheetDescription>
            {item.productSet.name}
            {item.number && ` #${item.number}/${item.productSet.code}`}
            {item.rarity && (
              <Badge className="ml-2" variant="secondary">
                {item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1)}
              </Badge>
            )}
            {item.regions?.map((region) => (
              <Badge key={region} className="ml-1" variant="outline">
                {({ japan: 'Japan', korea: 'Korea', taiwan_hong_kong: 'Taiwan & Hong Kong' } as Record<string, string>)[region] ?? region}
              </Badge>
            ))}
          </SheetDescription>
        </SheetHeader>

        {!isMobile && (
          <div className="flex gap-6 items-stretch px-4 lg:px-6">
            {item.imageUrl && (
              <ProductCardImage src={item.imageUrl} alt={item.name} />
            )}
            <div className="flex-1 min-w-0">
              <PsaGradePriceChart psaGradePrices={product?.psaGradePrices ?? []} />
            </div>
          </div>
        )}

        {grades && (
          <div className="w-full px-4 lg:px-6">
            <Card className="@container/card bg-gradient-to-t from-primary/5 to-card dark:bg-card backdrop-blur-md rounded-2xl border border-border p-6 shadow-xs w-full">
              <CardHeader>
                <CardTitle>PSA Pop Report</CardTitle>
                <CardDescription>
                  Grade distribution ·{' '}
                  {psaReport?.syncedAt
                    ? `Updated ${new Date(psaReport.syncedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}`
                    : ''}
                </CardDescription>
                {item.psaLink && (
                  <CardAction>
                    <a href={item.psaLink} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm" className="gap-1.5">
                        <ExternalLink className="w-3.5 h-3.5" />
                        PSA
                      </Button>
                    </a>
                  </CardAction>
                )}
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 sm:grid-cols-11 gap-2">
                  {grades.map(({ grade, count }) => (
                    <div key={grade} className="flex flex-col items-center gap-1 p-2 rounded-lg bg-muted">
                      <span className="text-xs text-muted-foreground font-medium">PSA {grade}</span>
                      <span className="text-sm font-semibold">{count != null ? count.toLocaleString() : '—'}</span>
                    </div>
                  ))}
                  <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-primary/10 col-span-1">
                    <span className="text-xs text-muted-foreground font-medium">Total</span>
                    <span className="text-sm font-semibold">{psaReport?.total != null ? psaReport.total.toLocaleString() : '—'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="w-full px-4 lg:px-6">
          <Card className="@container/card bg-gradient-to-t from-primary/5 to-card dark:bg-card backdrop-blur-md rounded-2xl border border-border p-6 shadow-xs w-full">
            <CardHeader>
              <CardTitle>Product Links</CardTitle>
              <CardDescription>Marketplaces & resources</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {item.cardMarketLink && (
                  <a href={item.cardMarketLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-xl bg-muted hover:bg-muted/70 transition-colors">
                    <ShoppingCart className="w-5 h-5 text-primary" />
                    <span className="text-sm font-medium">CardMarket</span>
                  </a>
                )}
                {item.tcgpLink && (
                  <a href={item.tcgpLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-xl bg-muted hover:bg-muted/70 transition-colors">
                    <ShoppingCart className="w-5 h-5 text-primary" />
                    <span className="text-sm font-medium">TCGPlayer</span>
                  </a>
                )}
                {item.cardkingdomBuyListLink && (
                  <a href={item.cardkingdomBuyListLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-xl bg-muted hover:bg-muted/70 transition-colors">
                    <Store className="w-5 h-5 text-primary" />
                    <span className="text-sm font-medium">Card Kingdom</span>
                  </a>
                )}
                {item.abugamesBuyListLink && (
                  <a href={item.abugamesBuyListLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-xl bg-muted hover:bg-muted/70 transition-colors">
                    <Store className="w-5 h-5 text-primary" />
                    <span className="text-sm font-medium">ABU Games</span>
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        <ProductNoteSection productId={item.id} initialNote={item.note} />
      </SheetContent>
    </Sheet>
  );

  return { open, setOpen: handleOpenChange, panel };
}

function ImageCell({ item }: { item: GetProductsResponseItem }) {
  const { setOpen, panel } = useProductPanel(item);

  if (!item.imageUrl) return null;
  return (
    <>
      <Tooltip disableHoverableContent>
        <TooltipTrigger asChild>
          <div className="flex justify-center cursor-pointer" onClick={() => setOpen(true)}>
            <img src={item.imageUrl} alt="" className="h-10 w-auto object-contain rounded" />
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="p-1 bg-transparent border-none shadow-none pointer-events-none">
          <img src={item.imageUrl} alt={item.name} className="h-64 w-auto object-contain rounded-lg shadow-xl" />
        </TooltipContent>
      </Tooltip>
      {panel}
    </>
  );
}

function TableCellViewer({ item }: { item: GetProductsResponseItem }) {
  const { setOpen, panel } = useProductPanel(item);

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="link" className="text-foreground w-full max-w-full px-0 text-left truncate block" onClick={() => setOpen(true)}>
            {item.name}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{item.name}</p>
        </TooltipContent>
      </Tooltip>
      {panel}
    </>
  );
}
