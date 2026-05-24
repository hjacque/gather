'use client';

import * as React from 'react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { ArrowUpDown, ExternalLink, ShoppingCart, Store } from 'lucide-react';
import { useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';

import { useIsMobile } from '@/hooks/use-mobile';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
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
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import type { GetProductsResponseItem } from '@/app/actions/getProducts';
import { ProductTable, RowActionsCell } from './product-table';

const columns: ColumnDef<GetProductsResponseItem>[] = [
  {
    accessorKey: 'name',
    meta: { fill: true },
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
    size: 90,
    accessorFn: (row) => row.productSet.name,
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
    size: 80,
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
    size: 60,
    header: '',
    cell: ({ row }) => (
      <a href={`${row.original.cardMarketLink}`} target="_blank" rel="noreferrer">
        <Button variant="buy" size="buySize">
          Buy
        </Button>
      </a>
    ),
  },
  {
    id: 'psaTotal',
    size: 120,
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
    id: 'actions',
    size: 52,
    cell: ({ row }) => <RowActionsCell row={row} />,
  },
];

export function PokemonJapanesePromosTable({
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
        const sets = Array.from(new Set(data.map((d) => d.productSet.name))).sort();
        const current = (table.getColumn('set')?.getFilterValue() as string) ?? '';
        return (
          <div className="flex items-center gap-2">
            <Select
              value={current || '__all__'}
              onValueChange={(v) =>
                table.getColumn('set')?.setFilterValue(v === '__all__' ? '' : v)
              }
            >
              <SelectTrigger size="sm" className="w-48">
                <SelectValue placeholder="All sets" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All sets</SelectItem>
                {sets.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      }}
    />
  );
}

function TableCellViewer({ item }: { item: GetProductsResponseItem }) {
  const isMobile = useIsMobile();
  const [product, setProduct] = useState<GetProductResponse | null>(null);
  const [timeRange, setTimeRange] = React.useState('360d');

  const fetchProduct = async () => {
    try {
      const data = await getProduct(item.id);
      setProduct(data);
    } catch (err) {
      console.error('Failed to load product detail', err);
    }
  };

  const chartData = React.useMemo(() => {
    if (!product) return [];
    const dateMap: Record<
      string,
      {
        date: string;
        market: number | null;
        buylist: number | null;
        cardmarketListingCount: number | null;
      }
    > = {};

    product.marketPrices?.forEach(({ date, value }) => {
      const key = date.toString();
      if (!dateMap[key])
        dateMap[key] = { date: key.slice(0, 10), market: null, buylist: null, cardmarketListingCount: null };
      dateMap[key].market = value;
    });
    product.buylistPrices?.forEach(({ date, value }) => {
      const key = date.toString();
      if (!dateMap[key])
        dateMap[key] = { date: key.slice(0, 10), market: null, buylist: null, cardmarketListingCount: null };
      dateMap[key].buylist = value;
    });
    product.cardmarketListingCount?.forEach(({ date, value }) => {
      const key = date.toString();
      if (!dateMap[key])
        dateMap[key] = { date: key.slice(0, 10), market: null, buylist: null, cardmarketListingCount: null };
      dateMap[key].cardmarketListingCount = value;
    });

    return Object.values(dateMap);
  }, [product]);

  const filteredData = chartData.filter((entry) => {
    const date = new Date(entry.date);
    const ref = new Date();
    const days = timeRange === '90d' ? 90 : timeRange === '30d' ? 30 : 360;
    const start = new Date(ref);
    start.setDate(start.getDate() - days);
    return date >= start;
  });

  const currencyFormatter = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  });

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

  return (
    <Sheet onOpenChange={(open) => open && fetchProduct()}>
      <SheetTrigger asChild>
        <Button variant="link" className="text-foreground w-fit px-0 text-left">
          {item.name}
        </Button>
      </SheetTrigger>
      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        className={`p-10 ${!isMobile ? 'w-1/2' : ''} sm:w-[1400px] sm:max-w-[1400px]`}
      >
        <SheetHeader>
          <SheetTitle>{item.name}</SheetTitle>
          <SheetDescription>
            {item.productSet.name}
            {item.number && ` #${item.productSet.code}${item.number}`}
            {item.rarity && (
              <Badge className="ml-2" variant="secondary">
                {item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1)}
              </Badge>
            )}
          </SheetDescription>
        </SheetHeader>

        {!isMobile && (
          <div className="flex gap-6 items-stretch px-4 lg:px-6">
            {item.imageUrl && (
              <ProductCardImage src={item.imageUrl} alt={item.name} />
            )}
            <div className="flex-1 min-w-0">
            <Card className="@container/card bg-gradient-to-t from-primary/5 to-card dark:bg-card backdrop-blur-md rounded-2xl border border-border p-6 shadow-xs w-full">
              <CardHeader>
                <CardTitle>Price Action</CardTitle>
                <CardDescription>
                  <span className="hidden @[540px]/card:block">Market & Buylist prices</span>
                  <span className="@[540px]/card:hidden">Last 3 months</span>
                </CardDescription>
                <CardAction>
                  <ToggleGroup
                    type="single"
                    value={timeRange}
                    onValueChange={setTimeRange}
                    variant="outline"
                    className="hidden *:data-[slot=toggle-group-item]:!px-4 @[767px]/card:flex"
                  >
                    <ToggleGroupItem value="360d">Last year</ToggleGroupItem>
                    <ToggleGroupItem value="90d">Last 3 months</ToggleGroupItem>
                    <ToggleGroupItem value="30d">Last 30 days</ToggleGroupItem>
                  </ToggleGroup>
                  <Select value={timeRange} onValueChange={setTimeRange}>
                    <SelectTrigger
                      className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
                      size="sm"
                      aria-label="Select a value"
                    >
                      <SelectValue placeholder="Last 3 months" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="360d" className="rounded-lg">
                        Last year
                      </SelectItem>
                      <SelectItem value="90d" className="rounded-lg">
                        Last 3 months
                      </SelectItem>
                      <SelectItem value="30d" className="rounded-lg">
                        Last 30 days
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </CardAction>
              </CardHeader>
              <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
                <ChartContainer
                  config={
                    {
                      market: { label: 'Market', color: 'var(--chart-1)' },
                      buylist: { label: 'Buylist', color: 'var(--chart-2)' },
                      cardmarketListingCount: {
                        label: 'Available Items',
                        color: 'var(--chart-3)',
                      },
                    } satisfies ChartConfig
                  }
                  className="w-full max-h-64"
                >
                  <AreaChart
                    accessibilityLayer
                    data={filteredData}
                    margin={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <CartesianGrid vertical={false} stroke="var(--grid-line)" />
                    <YAxis
                      yAxisId="left"
                      orientation="left"
                      dataKey="market"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={12}
                      tick={{ fontSize: 12, fill: '#999' }}
                      tickFormatter={(v) => currencyFormatter.format(v)}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      dataKey="cardmarketListingCount"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={12}
                      tick={{ fontSize: 12, fill: '#999' }}
                      tickFormatter={(v) => Intl.NumberFormat('en-US').format(v)}
                    />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={12}
                      tick={{ fontSize: 12, fill: '#999' }}
                      tickFormatter={(v) =>
                        new Date(v).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })
                      }
                    />
                    <ChartTooltip
                      cursor={{ stroke: 'var(--tooltip-cursor)', strokeWidth: 1 }}
                      content={
                        <ChartTooltipContent
                          indicator="line"
                          style={{ borderRadius: 8, boxShadow: '0 4px 10px rgba(0,0,0,0.08)' }}
                          valueFormatter={(value, key) =>
                            key === 'market' || key === 'buylist'
                              ? currencyFormatter.format(value)
                              : value.toString()
                          }
                        />
                      }
                    />
                    <Area
                      yAxisId="left"
                      dataKey="market"
                      name="Market Price"
                      type="monotone"
                      stroke="var(--chart-1)"
                      fill="var(--chart-1-fill)"
                      fillOpacity={0}
                      strokeWidth={2.5}
                      dot={false}
                    />
                    <Area
                      yAxisId="left"
                      dataKey="buylist"
                      name="Buylist Price"
                      type="monotone"
                      stroke="var(--chart-2)"
                      fill="var(--chart-2-fill)"
                      fillOpacity={0}
                      strokeWidth={2.5}
                      dot={false}
                    />
                    <Area
                      yAxisId="right"
                      dataKey="cardmarketListingCount"
                      name="Available Items"
                      type="monotone"
                      stroke="var(--chart-3)"
                      fill="var(--chart-3-fill)"
                      fillOpacity={0}
                      strokeWidth={2.5}
                      dot={false}
                    />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>
            </div>
          </div>
        )}

        {/* PSA Pop Report */}
        {grades && (
          <div className="w-full px-4 lg:px-6 mt-6">
            <Card className="@container/card bg-gradient-to-t from-primary/5 to-card dark:bg-card backdrop-blur-md rounded-2xl border border-border p-6 shadow-xs w-full">
              <CardHeader>
                <CardTitle>PSA Pop Report</CardTitle>
                <CardDescription>
                  Grade distribution ·{' '}
                  {psaReport?.syncedAt
                    ? `Updated ${new Date(psaReport.syncedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}`
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
                    <div
                      key={grade}
                      className="flex flex-col items-center gap-1 p-2 rounded-lg bg-muted"
                    >
                      <span className="text-xs text-muted-foreground font-medium">
                        PSA {grade}
                      </span>
                      <span className="text-sm font-semibold">
                        {count != null ? count.toLocaleString() : '—'}
                      </span>
                    </div>
                  ))}
                  <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-primary/10 col-span-1">
                    <span className="text-xs text-muted-foreground font-medium">Total</span>
                    <span className="text-sm font-semibold">
                      {psaReport?.total != null ? psaReport.total.toLocaleString() : '—'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Product Links */}
        <div className="w-full px-4 lg:px-6 mt-6">
          <Card className="@container/card bg-gradient-to-t from-primary/5 to-card dark:bg-card backdrop-blur-md rounded-2xl border border-border p-6 shadow-xs w-full">
            <CardHeader>
              <CardTitle>Product Links</CardTitle>
              <CardDescription>Marketplaces & resources</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {item.cardMarketLink && (
                  <a
                    href={item.cardMarketLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-xl bg-muted hover:bg-muted/70 transition-colors"
                  >
                    <ShoppingCart className="w-5 h-5 text-primary" />
                    <span className="text-sm font-medium">CardMarket</span>
                  </a>
                )}
                {item.tcgpLink && (
                  <a
                    href={item.tcgpLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-xl bg-muted hover:bg-muted/70 transition-colors"
                  >
                    <ShoppingCart className="w-5 h-5 text-primary" />
                    <span className="text-sm font-medium">TCGPlayer</span>
                  </a>
                )}
                {item.cardkingdomBuyListLink && (
                  <a
                    href={item.cardkingdomBuyListLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-xl bg-muted hover:bg-muted/70 transition-colors"
                  >
                    <Store className="w-5 h-5 text-primary" />
                    <span className="text-sm font-medium">Card Kingdom</span>
                  </a>
                )}
                {item.abugamesBuyListLink && (
                  <a
                    href={item.abugamesBuyListLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-xl bg-muted hover:bg-muted/70 transition-colors"
                  >
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
}
