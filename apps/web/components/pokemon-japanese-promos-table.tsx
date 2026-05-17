'use client';

import * as React from 'react';
import Image from 'next/image';
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconDotsVertical,
  IconLoader2,
} from '@tabler/icons-react';
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  Row,
  SortingState,
  useReactTable,
  VisibilityState,
} from '@tanstack/react-table';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';

import { useIsMobile } from '@/hooks/use-mobile';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { use, useState } from 'react';
import { ArrowUpDown, ExternalLink, ShoppingCart, Store } from 'lucide-react';
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
import { syncProduct } from '@/app/actions/syncProduct';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import type { GetProductsResponseItem } from '@/app/actions/getProducts';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

function DraggableRow({ row }: { row: Row<GetProductsResponseItem> }) {
  const { transform, transition, setNodeRef, isDragging } = useSortable({
    id: row.original.id,
  });

  return (
    <TableRow
      data-state={row.getIsSelected() && 'selected'}
      data-dragging={isDragging}
      ref={setNodeRef}
      className="relative z-0 data-[dragging=true]:z-10 data-[dragging=true]:opacity-80"
      style={{
        transform: CSS.Transform.toString(transform),
        transition: transition,
      }}
    >
      {row.getVisibleCells().map((cell) => (
        <TableCell key={cell.id}>
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </TableCell>
      ))}
    </TableRow>
  );
}

export function PokemonJapanesePromosTable({
  dataPromise: initialData,
  pageSize = 10,
}: {
  dataPromise: Promise<GetProductsResponseItem[]>;
  pageSize?: number;
}) {
  const [data, setData] = React.useState(use(initialData));
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = React.useState<SortingState>([{ id: 'releaseDate', desc: false }]);
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize });
  const sortableId = React.useId();
  const sensors = useSensors(
    useSensor(MouseSensor, {}),
    useSensor(TouchSensor, {}),
    useSensor(KeyboardSensor, {}),
  );

  const [loadingRowId, setLoadingRowId] = useState<string | null>(null);

  const handleSyncProduct = async (id: string) => {
    try {
      setLoadingRowId(id);
      const updatedProduct = await syncProduct(id);
      setData((prev) =>
        prev.map((product) => (product.id === id ? updatedProduct : product)),
      );
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingRowId(null);
    }
  };

  const dataIds = React.useMemo<UniqueIdentifier[]>(
    () => data?.map(({ id }) => id) || [],
    [data],
  );

  const columns: ColumnDef<GetProductsResponseItem>[] = [
    {
      accessorKey: 'name',
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
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Release <ArrowUpDown />
        </Button>
      ),
      cell: ({ row }) => {
        const date = row.original.releaseDate;
        return (
          <div className="text-muted-foreground text-sm whitespace-nowrap">
            {date ? new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }) : '-'}
          </div>
        );
      },
      enableSorting: true,
    },
    {
      id: 'set',
      accessorFn: (row) => row.productSet.name,
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Set <ArrowUpDown />
        </Button>
      ),
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
    },
    {
      accessorKey: 'buy',
      header: '',
      cell: ({ row }) => (
        <div>
          <a href={`${row.original.cardMarketLink}`} target="_blank" rel="noreferrer">
            <Button variant="buy" size="buySize">Buy</Button>
          </a>
        </div>
      ),
    },
    {
      accessorKey: 'market',
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Market <ArrowUpDown />
        </Button>
      ),
      cell: ({ row }) => {
        const fmt = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
        return (
          <div>
            {row.original.market != null ? fmt.format(row.original.market) : '-'}
          </div>
        );
      },
      enableSorting: true,
    },
    {
      id: '1dmarket',
      accessorFn: (row) => row.performance?.oneDayMarketPricePerformance ?? null,
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          1d % <ArrowUpDown />
        </Button>
      ),
      cell: ({ row }) => <Performance performance={row.getValue<number>('1dmarket')} />,
      enableSorting: true,
    },
    {
      id: '7dmarket',
      accessorFn: (row) => row.performance?.oneWeekMarketPricePerformance ?? null,
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          7d % <ArrowUpDown />
        </Button>
      ),
      cell: ({ row }) => <Performance performance={row.getValue<number>('7dmarket')} />,
      enableSorting: true,
    },
    {
      id: '30dmarket',
      accessorFn: (row) => row.performance?.oneMonthMarketPricePerformance ?? null,
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          30d % <ArrowUpDown />
        </Button>
      ),
      cell: ({ row }) => <Performance performance={row.getValue<number>('30dmarket')} />,
      enableSorting: true,
    },
    {
      id: 'cardmarketListingCount',
      accessorFn: (row) => row.cardmarketListingCount ?? null,
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Items <ArrowUpDown />
        </Button>
      ),
      cell: ({ row }) => (
        <div>{row.original.cardmarketListingCount ? `${row.original.cardmarketListingCount}` : '-'}</div>
      ),
      enableSorting: true,
    },
    {
      id: 'psaTotal',
      accessorFn: (row) => row.psaTotal ?? null,
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          PSA Pop <ArrowUpDown />
        </Button>
      ),
      cell: ({ row }) => (
        <div>{row.original.psaTotal != null ? row.original.psaTotal.toLocaleString() : '—'}</div>
      ),
      enableSorting: true,
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const isLoading = loadingRowId === row.original.id;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
                size="icon"
                disabled={isLoading}
              >
                {isLoading ? <IconLoader2 className="animate-spin" /> : <IconDotsVertical />}
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-full">
              <DropdownMenuItem disabled={isLoading} onSelect={() => handleSyncProduct(row.original.id)}>
                Sync
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnVisibility, rowSelection, columnFilters, pagination },
    getRowId: (row) => row.id.toString(),
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      setData((data) => {
        const oldIndex = dataIds.indexOf(active.id);
        const newIndex = dataIds.indexOf(over.id);
        return arrayMove(data, oldIndex, newIndex);
      });
    }
  }

  return (
    <Tabs defaultValue="outline" className="w-full flex-col justify-start gap-6">
      <TabsContent
        value="outline"
        className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6"
      >
        <div className="overflow-hidden rounded-lg border">
          <DndContext
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={handleDragEnd}
            sensors={sensors}
            id={sortableId}
          >
            <Table>
              <TableHeader className="bg-gradient-to-t from-primary/5 to-card dark:bg-card backdrop-blur-md shadow-xs sticky top-0 z-10">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id} colSpan={header.colSpan}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody className="**:data-[slot=table-cell]:first:w-8">
                {table.getRowModel().rows?.length ? (
                  <SortableContext items={dataIds} strategy={verticalListSortingStrategy}>
                    {table.getRowModel().rows.map((row) => (
                      <DraggableRow key={row.id} row={row} />
                    ))}
                  </SortableContext>
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                      No results.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </DndContext>
        </div>
        <div className="flex items-center justify-between px-4">
          <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
            {table.getFilteredSelectedRowModel().rows.length} of{' '}
            {table.getFilteredRowModel().rows.length} row(s) selected.
          </div>
          <div className="flex w-full items-center gap-8 lg:w-fit">
            <div className="hidden items-center gap-2 lg:flex">
              <Label htmlFor="rows-per-page" className="text-sm font-medium">
                Rows per page
              </Label>
              <Select
                value={`${table.getState().pagination.pageSize}`}
                onValueChange={(value) => table.setPageSize(Number(value))}
              >
                <SelectTrigger size="sm" className="w-20" id="rows-per-page">
                  <SelectValue placeholder={table.getState().pagination.pageSize} />
                </SelectTrigger>
                <SelectContent side="top">
                  {[10, 20, 30, 40, 50, 100].map((pageSize) => (
                    <SelectItem key={pageSize} value={`${pageSize}`}>{pageSize}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex w-fit items-center justify-center text-sm font-medium">
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
            </div>
            <div className="ml-auto flex items-center gap-2 lg:ml-0">
              <Button variant="outline" className="hidden h-8 w-8 p-0 lg:flex" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()}>
                <span className="sr-only">Go to first page</span>
                <IconChevronsLeft />
              </Button>
              <Button variant="outline" className="size-8" size="icon" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
                <span className="sr-only">Go to previous page</span>
                <IconChevronLeft />
              </Button>
              <Button variant="outline" className="size-8" size="icon" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
                <span className="sr-only">Go to next page</span>
                <IconChevronRight />
              </Button>
              <Button variant="outline" className="hidden size-8 lg:flex" size="icon" onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()}>
                <span className="sr-only">Go to last page</span>
                <IconChevronsRight />
              </Button>
            </div>
          </div>
        </div>
      </TabsContent>
    </Tabs>
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
    const dateMap: Record<string, { date: string; market: number | null; buylist: number | null; cardmarketListingCount: number | null }> = {};

    product.marketPrices?.forEach(({ date, value }) => {
      const key = date.toString();
      if (!dateMap[key]) dateMap[key] = { date: key.slice(0, 10), market: null, buylist: null, cardmarketListingCount: null };
      dateMap[key].market = value;
    });
    product.buylistPrices?.forEach(({ date, value }) => {
      const key = date.toString();
      if (!dateMap[key]) dateMap[key] = { date: key.slice(0, 10), market: null, buylist: null, cardmarketListingCount: null };
      dateMap[key].buylist = value;
    });
    product.cardmarketListingCount?.forEach(({ date, value }) => {
      const key = date.toString();
      if (!dateMap[key]) dateMap[key] = { date: key.slice(0, 10), market: null, buylist: null, cardmarketListingCount: null };
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
                    <SelectTrigger className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden" size="sm" aria-label="Select a value">
                      <SelectValue placeholder="Last 3 months" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="360d" className="rounded-lg">Last year</SelectItem>
                      <SelectItem value="90d" className="rounded-lg">Last 3 months</SelectItem>
                      <SelectItem value="30d" className="rounded-lg">Last 30 days</SelectItem>
                    </SelectContent>
                  </Select>
                </CardAction>
              </CardHeader>
              <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
                <ChartContainer
                  config={{
                    market: { label: 'Market', color: 'var(--chart-1)' },
                    buylist: { label: 'Buylist', color: 'var(--chart-2)' },
                    cardmarketListingCount: { label: 'Available Items', color: 'var(--chart-3)' },
                  } satisfies ChartConfig}
                  className="w-full max-h-64"
                >
                  <AreaChart accessibilityLayer data={filteredData} margin={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <CartesianGrid vertical={false} stroke="var(--grid-line)" />
                    <YAxis yAxisId="left" orientation="left" dataKey="market" tickLine={false} axisLine={false} tickMargin={12} tick={{ fontSize: 12, fill: '#999' }} tickFormatter={(v) => currencyFormatter.format(v)} />
                    <YAxis yAxisId="right" orientation="right" dataKey="cardmarketListingCount" tickLine={false} axisLine={false} tickMargin={12} tick={{ fontSize: 12, fill: '#999' }} tickFormatter={(v) => Intl.NumberFormat('en-US').format(v)} />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={12} tick={{ fontSize: 12, fill: '#999' }} tickFormatter={(v) => new Date(v).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })} />
                    <ChartTooltip cursor={{ stroke: 'var(--tooltip-cursor)', strokeWidth: 1 }} content={<ChartTooltipContent indicator="line" style={{ borderRadius: 8, boxShadow: '0 4px 10px rgba(0,0,0,0.08)' }} valueFormatter={(value, key) => key === 'market' || key === 'buylist' ? currencyFormatter.format(value) : value.toString()} />} />
                    <Area yAxisId="left" dataKey="market" name="Market Price" type="monotone" stroke="var(--chart-1)" fill="var(--chart-1-fill)" fillOpacity={0} strokeWidth={2.5} dot={false} />
                    <Area yAxisId="left" dataKey="buylist" name="Buylist Price" type="monotone" stroke="var(--chart-2)" fill="var(--chart-2-fill)" fillOpacity={0} strokeWidth={2.5} dot={false} />
                    <Area yAxisId="right" dataKey="cardmarketListingCount" name="Available Items" type="monotone" stroke="var(--chart-3)" fill="var(--chart-3-fill)" fillOpacity={0} strokeWidth={2.5} dot={false} />
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
                  Grade distribution · {psaReport?.syncedAt ? `Updated ${new Date(psaReport.syncedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}` : ''}
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
                <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                  {grades.map(({ grade, count }) => (
                    <div key={grade} className="flex flex-col items-center gap-1 p-2 rounded-lg bg-muted">
                      <span className="text-xs text-muted-foreground font-medium">PSA {grade}</span>
                      <span className="text-sm font-semibold">{count != null ? count.toLocaleString() : '—'}</span>
                    </div>
                  ))}
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
      </SheetContent>
    </Sheet>
  );
}
