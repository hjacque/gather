'use client';

import * as React from 'react';
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
import { use, useMemo, useState } from 'react';
import { ArrowUpDown, LinkIcon, ShoppingCart, Store } from 'lucide-react';
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
import { TypeMultiSelectFilter } from './type-multiselect-filter';
import { ProductSetMultiSelectFilter } from './set-multiselect-filter';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { syncProduct } from '@/app/actions/syncProduct';
import type { GetProductsResponseItem } from '@/app/actions/getProducts';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

function DraggableRow({
  row,
}: {
  row: Row<GetProductsResponseItem>;
}) {
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

export function RiftboundSealedProductsTable({
  dataPromise: initialData,
  type,
  set,
  pageSize = 10,
}: {
  dataPromise: Promise<GetProductsResponseItem[]>;
  type?: boolean;
  set?: boolean;
  pageSize?: number;
}) {
  const [data, setData] = React.useState(use(initialData));

  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize,
  });
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
        <div className="w-32">
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
      enableColumnFilter: set,
      filterFn: (row, columnId, filterValue: string[]) => {
        if (!filterValue?.length) return true; // "All"
        return filterValue.includes(row.getValue(columnId));
      },
    },
    {
      id: 'releaseDate',
      accessorFn: (row) => row.productSet.releaseDate,
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Release
            <ArrowUpDown />
          </Button>
        );
      },
      cell: ({ row }) => {
        return (
          <div>
            {row.original.productSet.releaseDate
              ? `${new Date(row.original.productSet.releaseDate).toISOString().split('T')[0]}`
              : '-'}
          </div>
        );
      },
      enableSorting: true,
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
            {typeof row.original.market === 'number'
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
        return <Performance performance={value}></Performance>;
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
        return <Performance performance={value}></Performance>;
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
        return <Performance performance={value}></Performance>;
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
            Available Items
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
      accessorKey: 'perBooster',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Booster
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
            {typeof row.original.perBooster === 'number'
              ? currencyFormatter.format(row.original.perBooster)
              : '-'}
          </div>
        );
      },
      enableSorting: true,
    },
    {
      accessorKey: 'tcgp',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            TCGP
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
            {typeof row.original.tcgp === 'number'
              ? currencyFormatter.format(row.original.tcgp)
              : '-'}
          </div>
        );
      },
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
                {isLoading ? (
                  <IconLoader2 className="animate-spin" />
                ) : (
                  <IconDotsVertical />
                )}
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-full">
              <DropdownMenuItem
                disabled={isLoading}
                onSelect={() => handleSyncProduct(row.original.id)}
              >
                Sync
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
    {
      accessorKey: 'type',
      header: undefined,
      filterFn: (row, columnId, filterValue: string[]) => {
        if (!filterValue?.length) return true; // "All"
        return filterValue.includes(row.getValue(columnId));
      },
      cell: undefined,
      enableHiding: true,
      enableSorting: false,
      enableColumnFilter: type,
    },
  ];

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      pagination,
    },
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

  const allTypes = useMemo<string[]>(() => {
    const set = new Set(data.map((item) => item.type));
    return Array.from(set).sort();
  }, [data]);

  const allProductSets = useMemo<string[]>(() => {
    const set = new Set(data.map((item) => item.productSet.name));
    return Array.from(set).sort();
  }, [data]);

  return (
    <Tabs
      defaultValue="outline"
      className="w-full flex-col justify-start gap-6"
    >
      <TabsContent
        value="outline"
        className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6"
      >
        {(type || set) && (
          <div className="flex justify-items-start gap-4">
            {type && (
              <TypeMultiSelectFilter table={table} allTypes={allTypes} />
            )}
            {set && (
              <ProductSetMultiSelectFilter
                table={table}
                allProductSets={allProductSets}
              />
            )}
          </div>
        )}
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
                    {headerGroup.headers.map((header) => {
                      return (
                        <TableHead key={header.id} colSpan={header.colSpan}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody className="**:data-[slot=table-cell]:first:w-8">
                {table.getRowModel().rows?.length ? (
                  <SortableContext
                    items={dataIds}
                    strategy={verticalListSortingStrategy}
                  >
                    {table.getRowModel().rows.map((row) => (
                      <DraggableRow key={row.id} row={row} />
                    ))}
                  </SortableContext>
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
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
                onValueChange={(value) => {
                  table.setPageSize(Number(value));
                }}
              >
                <SelectTrigger size="sm" className="w-20" id="rows-per-page">
                  <SelectValue
                    placeholder={table.getState().pagination.pageSize}
                  />
                </SelectTrigger>
                <SelectContent side="top">
                  {[10, 20, 30, 40, 50, 100].map((pageSize) => (
                    <SelectItem key={pageSize} value={`${pageSize}`}>
                      {pageSize}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex w-fit items-center justify-center text-sm font-medium">
              Page {table.getState().pagination.pageIndex + 1} of{' '}
              {table.getPageCount()}
            </div>
            <div className="ml-auto flex items-center gap-2 lg:ml-0">
              <Button
                variant="outline"
                className="hidden h-8 w-8 p-0 lg:flex"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">Go to first page</span>
                <IconChevronsLeft />
              </Button>
              <Button
                variant="outline"
                className="size-8"
                size="icon"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">Go to previous page</span>
                <IconChevronLeft />
              </Button>
              <Button
                variant="outline"
                className="size-8"
                size="icon"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Go to next page</span>
                <IconChevronRight />
              </Button>
              <Button
                variant="outline"
                className="hidden size-8 lg:flex"
                size="icon"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Go to last page</span>
                <IconChevronsRight />
              </Button>
            </div>
          </div>
        </div>
      </TabsContent>
      <TabsContent
        value="past-performance"
        className="flex flex-col px-4 lg:px-6"
      >
        <div className="aspect-video w-full flex-1 rounded-lg border border-dashed"></div>
      </TabsContent>
      <TabsContent value="key-personnel" className="flex flex-col px-4 lg:px-6">
        <div className="aspect-video w-full flex-1 rounded-lg border border-dashed"></div>
      </TabsContent>
      <TabsContent
        value="focus-documents"
        className="flex flex-col px-4 lg:px-6"
      >
        <div className="aspect-video w-full flex-1 rounded-lg border border-dashed"></div>
      </TabsContent>
    </Tabs>
  );
}

function TableCellViewer({
  item,
}: {
  item: GetProductsResponseItem;
}) {
  const isMobile = useIsMobile();
  const [chartData, setChartData] = useState<
    {
      date: string;
      market: number | null;
      cardmarketListingCount: number | null;
      fullSet: number | null;
    }[]
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
          cardmarketListingCount: number | null;
          fullSet: number | null;
          tcgp: number | null;
        }
      > = {};

      product.marketPrices?.forEach(({ date, value }) => {
        const dateStr = date.toString();
        if (!dateMap[dateStr])
          dateMap[dateStr] = {
            date: dateStr.slice(0, 10),
            market: null,
            cardmarketListingCount: null,
            fullSet: null,
            tcgp: null,
          };
        dateMap[dateStr].market = value;
      });

      product.cardmarketListingCount?.forEach(({ date, value }) => {
        const dateStr = date.toString();
        if (!dateMap[dateStr])
          dateMap[dateStr] = {
            date: dateStr.slice(0, 10),
            market: null,
            cardmarketListingCount: null,
            fullSet: null,
            tcgp: null,
          };
        dateMap[dateStr].cardmarketListingCount = value;
      });

      product.fullSetPrices?.forEach(({ date, value }) => {
        const dateStr = date.toString();
        if (!dateMap[dateStr])
          dateMap[dateStr] = {
            date: dateStr.slice(0, 10),
            market: null,
            cardmarketListingCount: null,
            fullSet: null,
            tcgp: null,
          };
        dateMap[dateStr].fullSet = value;
      });

      product.tcgpPrices?.forEach(({ date, value }) => {
        const dateStr = date.toString();
        if (!dateMap[dateStr])
          dateMap[dateStr] = {
            date: dateStr.slice(0, 10),
            market: null,
            cardmarketListingCount: null,
            fullSet: null,
            tcgp: null,
          };
        dateMap[dateStr].tcgp = value;
      });

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
          <SheetDescription>{item.productSet.name}</SheetDescription>
        </SheetHeader>
        {!isMobile && (
          <div className="w-full px-4 lg:px-6">
            <Card className="@container/card bg-gradient-to-t from-primary/5 to-card dark:bg-card backdrop-blur-md rounded-2xl border border-border p-6 shadow-xs w-full">
              <CardHeader>
                <CardTitle>Price Action</CardTitle>
                <CardDescription>
                  <span className="hidden @[540px]/card:block">
                    Market prices
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
                      cardmarketListingCount: {
                        label: 'Available Items',
                        color: 'var(--chart-3)',
                      },
                      fullSet: {
                        label: 'Full Set',
                        color: 'var(--chart-4)',
                      },
                      tcgp: {
                        label: 'TCGP',
                        color: 'var(--chart-5)',
                      },
                    } satisfies ChartConfig
                  }
                  className="w-full max-h-88"
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
                            if (
                              key === 'market' ||
                              key === 'fullSet' ||
                              key === 'tcgp'
                            ) {
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
                      dataKey="fullSet"
                      name="Full Set Price"
                      type="monotone"
                      stroke="var(--chart-4)"
                      fill="var(--chart-4-fill)"
                      fillOpacity={0}
                      strokeWidth={2.5}
                      dot={false}
                      hide={!item.fullSet}
                    />
                    <Area
                      yAxisId="left"
                      dataKey="tcgp"
                      name="TCGP"
                      type="monotone"
                      stroke="var(--chart-5)"
                      fill="var(--chart-5-fill)"
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
