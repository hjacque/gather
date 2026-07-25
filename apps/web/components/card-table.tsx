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
} from '@tabler/icons-react';
import { RefreshCw } from 'lucide-react';
import {
  type ColumnDef,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type Row,
  type SortingState,
  type Table as TableInstance,
  useReactTable,
  type VisibilityState,
} from '@tanstack/react-table';
import { use, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { syncCardCardMarket, syncCardPsa, syncCardSales } from '@/app/actions/syncCard';
import type { GetCardsResponseItem } from '@gather/api-contract';

type SyncAction = 'cardmarket' | 'psa' | 'sales';

const CardSyncContext = React.createContext<{
  handleSyncCard: (id: string, action: SyncAction) => Promise<void>;
  loadingRow: { id: string; action: SyncAction } | null;
}>({ handleSyncCard: async () => {}, loadingRow: null });

export function useCardSync() {
  return React.useContext(CardSyncContext);
}

function DraggableRow({ row }: { row: Row<GetCardsResponseItem> }) {
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
      {row.getVisibleCells().map((cell) => {
        const meta = cell.column.columnDef.meta as { fill?: boolean; cellClassName?: string } | undefined;
        const size = cell.column.getSize();
        return (
          <TableCell key={cell.id} className={meta?.cellClassName} style={meta?.fill ? undefined : { width: size, maxWidth: size }}>
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </TableCell>
        );
      })}
    </TableRow>
  );
}

export function RowActionsCell({ row, extraItems }: { row: Row<GetCardsResponseItem>; extraItems?: React.ReactNode }) {
  const { handleSyncCard, loadingRow } = useCardSync();
  const isLoadingCardMarket = loadingRow?.id === row.original.id && loadingRow.action === 'cardmarket';
  const isLoadingPsa = loadingRow?.id === row.original.id && loadingRow.action === 'psa';
  const isLoadingSales = loadingRow?.id === row.original.id && loadingRow.action === 'sales';
  const isAnySyncing = isLoadingCardMarket || isLoadingPsa || isLoadingSales;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={`data-[state=open]:bg-muted text-muted-foreground flex size-8${isAnySyncing ? ' transition-none' : ''}`}
          size="icon"
        >
          {isAnySyncing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <IconDotsVertical />}
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-full">
        <DropdownMenuItem
          disabled={isLoadingCardMarket}
          onSelect={() => handleSyncCard(row.original.id, 'cardmarket')}
        >
          <RefreshCw className={`w-3.5 h-3.5${isLoadingCardMarket ? ' animate-spin' : ''}`} />
          Sync CardMarket
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={isLoadingPsa}
          onSelect={() => handleSyncCard(row.original.id, 'psa')}
        >
          <RefreshCw className={`w-3.5 h-3.5${isLoadingPsa ? ' animate-spin' : ''}`} />
          Sync PSA
        </DropdownMenuItem>
        {row.original.ebayLink && (
          <DropdownMenuItem
            disabled={isLoadingSales}
            onSelect={() => handleSyncCard(row.original.id, 'sales')}
          >
            <RefreshCw className={`w-3.5 h-3.5${isLoadingSales ? ' animate-spin' : ''}`} />
            Sync eBay
          </DropdownMenuItem>
        )}
        {extraItems && <><DropdownMenuSeparator />{extraItems}</>}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export type CardTableHandle = {
  getAllRows: () => GetCardsResponseItem[];
  goToPage: (idx: number) => void;
  pageSize: number;
  updateRow: (id: string, patch: Partial<GetCardsResponseItem>) => void;
};

export function CardTable({
  dataPromise: initialData,
  columns,
  pageSize = 250,
  defaultSorting = [],
  filters,
  tableRef,
}: {
  dataPromise: Promise<GetCardsResponseItem[]>;
  columns: ColumnDef<GetCardsResponseItem>[];
  pageSize?: number;
  defaultSorting?: SortingState;
  filters?: (
    data: GetCardsResponseItem[],
    table: TableInstance<GetCardsResponseItem>,
  ) => React.ReactNode;
  tableRef?: React.RefObject<CardTableHandle | null>;
}) {
  const [data, setData] = React.useState(use(initialData));
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [sorting, setSorting] = React.useState<SortingState>(defaultSorting);
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize });
  const sortableId = React.useId();
  const sensors = useSensors(
    useSensor(MouseSensor, {}),
    useSensor(TouchSensor, {}),
    useSensor(KeyboardSensor, {}),
  );
  const [loadingRow, setLoadingRow] = useState<{ id: string; action: SyncAction } | null>(null);

  const handleSyncCard = async (id: string, action: SyncAction) => {
    try {
      setLoadingRow({ id, action });
      if (action === 'sales') {
        await syncCardSales(id);
        return;
      }
      const updatedCard = action === 'cardmarket'
        ? await syncCardCardMarket(id)
        : await syncCardPsa(id);
      setData((prev) => prev.map((c) => (c.id === id ? updatedCard : c)));
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingRow(null);
    }
  };

  const dataIds = React.useMemo<UniqueIdentifier[]>(
    () => data?.map(({ id }) => id) || [],
    [data],
  );

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

  React.useImperativeHandle(tableRef, () => ({
    getAllRows: () => table.getSortedRowModel().rows.map((r) => r.original),
    goToPage: (idx: number) => table.setPageIndex(idx),
    updateRow: (id: string, patch: Partial<GetCardsResponseItem>) =>
      setData((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c))),
    get pageSize() {
      return table.getState().pagination.pageSize;
    },
  }));

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
    <CardSyncContext.Provider value={{ handleSyncCard, loadingRow }}>
      <Tabs defaultValue="outline" className="w-full flex-col justify-start gap-6">
        <TabsContent
          value="outline"
          className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6"
        >
          {filters && filters(data, table)}
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
                        const fill = (header.column.columnDef.meta as { fill?: boolean } | undefined)?.fill;
                        const size = header.getSize();
                        return (
                          <TableHead
                            key={header.id}
                            colSpan={header.colSpan}
                            style={fill ? undefined : { width: size, maxWidth: size }}
                          >
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
                    {[20, 30, 40, 50, 100, 250].map((pageSize) => (
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
    </CardSyncContext.Provider>
  );
}
