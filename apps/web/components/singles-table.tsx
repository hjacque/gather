'use client';

import * as React from 'react';
import Image from 'next/image';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { type ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, LinkIcon, ShoppingCart, Store } from 'lucide-react';

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
import { Performance } from '@/components/performance';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from './ui/sheet';
import { getProduct } from '@/app/actions/getProduct';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card';
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group';
import type { GetProductsResponseItem } from '@/app/actions/getProducts';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { ProductSetMultiSelectFilter } from './set-multiselect-filter';
import { ProductTable, RowActionsCell } from './product-table';
import { useState } from 'react';

const columns: ColumnDef<GetProductsResponseItem>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Name
          <ArrowUpDown />
        </Button>
      );
    },
    cell: ({ row }) => {
      return <TableCellViewer item={row.original} />;
    },
    enableHiding: false,
    enableSorting: true,
  },
  {
    id: 'set',
    accessorFn: (row) => row.productSet.name,
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Set
          <ArrowUpDown />
        </Button>
      );
    },
    cell: ({ row }) => (
      <div className="w-28">
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className="text-muted-foreground px-1.5 max-w-[10rem] truncate overflow-hidden whitespace-nowrap justify-start text-left"
            >
              {row.original.productSet.name}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>{row.original.productSet.name}</p>
          </TooltipContent>
        </Tooltip>
      </div>
    ),
    enableColumnFilter: true,
    filterFn: (row, columnId, filterValue: string[]) => {
      if (!filterValue?.length) return true; // "All"
      return filterValue.includes(row.getValue(columnId));
    },
  },
  {
    accessorKey: 'buy',
    header: '',
    cell: ({ row }) => (
      <div>
        <a
          href={`${row.original.cardMarketLink}`}
          target="_blank"
          rel="noreferrer"
        >
          <Button variant="buy" size="buySize">
            Buy
          </Button>
        </a>
      </div>
    ),
  },
  {
    accessorKey: 'market',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Market
          <ArrowUpDown />
        </Button>
      );
    },
    cell: ({ row }) => {
      const currencyFormatter = new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
      });
      return (
        <div>
          {row.original.market !== null && row.original.market !== undefined
            ? currencyFormatter.format(row.original.market)
            : '-'}
        </div>
      );
    },
    enableSorting: true,
  },
  {
    id: '1dmarket',
    accessorFn: (row) =>
      row.performance?.oneDayMarketPricePerformance ?? null,
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          1d %
          <ArrowUpDown />
        </Button>
      );
    },
    cell: ({ row }) => {
      const value = row.getValue<number>('1dmarket');
      return (
        <div>
          <Performance performance={value}></Performance>
        </div>
      );
    },
    enableSorting: true,
  },
  {
    id: '7dmarket',
    accessorFn: (row) =>
      row.performance?.oneWeekMarketPricePerformance ?? null,
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          7d %
          <ArrowUpDown />
        </Button>
      );
    },
    cell: ({ row }) => {
      const value = row.getValue<number>('7dmarket');
      return (
        <div>
          <Performance performance={value}></Performance>
        </div>
      );
    },
    enableSorting: true,
  },
  {
    id: '30dmarket',
    accessorFn: (row) =>
      row.performance?.oneMonthMarketPricePerformance ?? null,
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          30d %
          <ArrowUpDown />
        </Button>
      );
    },
    cell: ({ row }) => {
      const value = row.getValue<number>('30dmarket');
      return (
        <div>
          <Performance performance={value}></Performance>
        </div>
      );
    },
    enableSorting: true,
  },
  {
    accessorKey: 'buylist',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Buylist
          <ArrowUpDown />
        </Button>
      );
    },
    cell: ({ row }) => {
      const currencyFormatter = new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
      });
      return (
        <div>
          {row.original.buylist !== null && row.original.buylist !== undefined
            ? currencyFormatter.format(row.original.buylist)
            : '-'}
        </div>
      );
    },
    enableSorting: true,
  },
  {
    id: '1dbuylist',
    accessorFn: (row) =>
      row.performance?.oneDayBuylistPricePerformance ?? null,
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          1d %
          <ArrowUpDown />
        </Button>
      );
    },
    cell: ({ row }) => {
      const value = row.getValue<number>('1dbuylist');
      return (
        <div>
          <Performance performance={value}></Performance>
        </div>
      );
    },
    enableSorting: true,
  },
  {
    id: '7dbuylist',
    accessorFn: (row) =>
      row.performance?.oneWeekBuylistPricePerformance ?? null,
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          7d %
          <ArrowUpDown />
        </Button>
      );
    },
    cell: ({ row }) => {
      const value = row.getValue<number>('7dbuylist');
      return (
        <div>
          <Performance performance={value}></Performance>
        </div>
      );
    },
    enableSorting: true,
  },
  {
    id: '30dbuylist',
    accessorFn: (row) =>
      row.performance?.oneMonthBuylistPricePerformance ?? null,
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          30d %
          <ArrowUpDown />
        </Button>
      );
    },
    cell: ({ row }) => {
      const value = row.getValue<number>('30dbuylist');
      return (
        <div>
          <Performance performance={value}></Performance>
        </div>
      );
    },
    enableSorting: true,
  },
  {
    id: 'cardmarketListingCount',
    accessorFn: (row) => row.cardmarketListingCount ?? null,
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Items
          <ArrowUpDown />
        </Button>
      );
    },
    cell: ({ row }) => {
      return (
        <div>
          {row.original.cardmarketListingCount
            ? `${row.original.cardmarketListingCount}`
            : '-'}
        </div>
      );
    },
    enableSorting: true,
  },
  {
    accessorKey: 'ratio',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          ratio
          <ArrowUpDown />
        </Button>
      );
    },
    cell: ({ row }) => {
      return <div>{row.original.ratio ? `${row.original.ratio}%` : '-'}</div>;
    },
    enableSorting: true,
  },
  {
    id: 'actions',
    cell: ({ row }) => <RowActionsCell row={row} />,
  },
];

export function SinglesTable({
  dataPromise,
  productSet,
  pageSize = 10,
}: {
  dataPromise: Promise<GetProductsResponseItem[]>;
  productSet?: boolean;
  pageSize?: number;
}) {
  return (
    <ProductTable
      dataPromise={dataPromise}
      columns={columns}
      pageSize={pageSize}
      filters={
        productSet
          ? (data, table) => {
              const allProductSets = [
                ...new Set(data.map((i) => i.productSet.name)),
              ].sort();
              return (
                <ProductSetMultiSelectFilter
                  table={table}
                  allProductSets={allProductSets}
                />
              );
            }
          : undefined
      }
    />
  );
}

function TableCellViewer({
  item,
}: {
  item: GetProductsResponseItem;
}) {
  const isMobile = useIsMobile();
  const [chartData, setChartData] = useState<
    { date: string; market: number | null; buylist: number | null }[]
  >([]);
  const [timeRange, setTimeRange] = React.useState('360d');

  // const formatPercentage = (value?: number | null) => {
  //   if (value == null) return "N/A"
  //   return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`
  // }

  // const TrendIcon = (value?: number | null) =>
  //   value == null ? null : value >= 0 ? <IconTrendingUp className="size-4" /> : <IconTrendingDown className="size-4" />

  const fetchChartData = async () => {
    try {
      const product = await getProduct(item.id);

      // Merge marketPrices and buylistPrices by date
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
        const dateStr = date.toString();
        if (!dateMap[dateStr])
          dateMap[dateStr] = {
            date: dateStr.slice(0, 10),
            market: null,
            buylist: null,
            cardmarketListingCount: null,
          };
        dateMap[dateStr].market = value;
      });

      product.buylistPrices?.forEach(({ date, value }) => {
        const dateStr = date.toString();
        if (!dateMap[dateStr])
          dateMap[dateStr] = {
            date: dateStr.slice(0, 10),
            market: null,
            buylist: null,
            cardmarketListingCount: null,
          };
        dateMap[dateStr].buylist = value;
      });

      product.cardmarketListingCount?.forEach(({ date, value }) => {
        const dateStr = date.toString();
        if (!dateMap[dateStr])
          dateMap[dateStr] = {
            date: dateStr.slice(0, 10),
            market: null,
            buylist: null,
            cardmarketListingCount: null,
          };
        dateMap[dateStr].cardmarketListingCount = value;
      });

      // const merged = Object.values(dateMap).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

      setChartData(Object.values(dateMap));
    } catch (err) {
      console.error('Failed to load chart data', err);
    }
  };

  const filteredData = chartData.filter((item) => {
    const date = new Date(item.date);
    const referenceDate = new Date();
    let daysToSubtract = 360;
    if (timeRange === '90d') {
      daysToSubtract = 90;
    } else if (timeRange === '30d') {
      daysToSubtract = 30;
    }
    const startDate = new Date(referenceDate);
    startDate.setDate(startDate.getDate() - daysToSubtract);
    return date >= startDate;
  });

  const currencyFormatter = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    trailingZeroDisplay: 'stripIfInteger',
  });

  return (
    <Sheet onOpenChange={(open) => open && fetchChartData()}>
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
              <a href={item.imageUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 w-56 relative">
                <Image
                  src={item.imageUrl}
                  alt={item.name}
                  fill
                  className="rounded-xl object-contain drop-shadow-md"
                />
              </a>
            )}
            <div className="flex-1 min-w-0">
            <Card className="@container/card bg-gradient-to-t from-primary/5 to-card dark:bg-card backdrop-blur-md rounded-2xl border border-border p-6 shadow-xs w-full">
              <CardHeader>
                <CardTitle>Price Action</CardTitle>
                <CardDescription>
                  <span className="hidden @[540px]/card:block">
                    Market & Buylist prices
                  </span>
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
                      market: {
                        label: 'Market',
                        color: 'var(--chart-1)',
                      },
                      buylist: {
                        label: 'Buylist',
                        color: 'var(--chart-2)',
                      },
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
                      tickFormatter={(value) => {
                        return currencyFormatter.format(value);
                      }}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      dataKey="cardmarketListingCount"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={12}
                      tick={{ fontSize: 12, fill: '#999' }}
                      tickFormatter={(value) =>
                        Intl.NumberFormat('en-US').format(value)
                      }
                    />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={12}
                      tick={{ fontSize: 12, fill: '#999' }}
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return date.toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        });
                      }}
                    />
                    <ChartTooltip
                      cursor={{
                        stroke: 'var(--tooltip-cursor)',
                        strokeWidth: 1,
                      }}
                      content={
                        <ChartTooltipContent
                          indicator="line"
                          style={{
                            borderRadius: 8,
                            boxShadow: '0 4px 10px rgba(0,0,0,0.08)',
                          }}
                          valueFormatter={(value, key) => {
                            if (key === 'market' || key === 'buylist') {
                              return currencyFormatter.format(value);
                            }
                            if (key === 'cardmarketListingCount') {
                              return value.toString();
                            }
                            return value;
                          }}
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
        {/* Links Section */}
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

                {item.fullSetLink && (
                  <a
                    href={item.fullSetLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-xl bg-muted hover:bg-muted/70 transition-colors"
                  >
                    <LinkIcon className="w-5 h-5 text-primary" />
                    <span className="text-sm font-medium">Full Set</span>
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
}
