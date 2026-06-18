'use client';

import * as React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
} from '@tanstack/react-table';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  ArrowUpDown,
  ExternalLink,
  Gavel,
  MoreVertical,
  Pencil,
  RefreshCw,
  Trash2,
} from 'lucide-react';

import type { GetAuctionsResponse, GetCardResponse } from '@gather/api-contract';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
} from '@tabler/icons-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
} from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CardImage } from '@/components/card-image';
import { AuctionCountdown } from '@/components/auction-countdown';
import { EbaySalesChart } from '@/components/ebay-sales-chart';
import { CardListingsTable } from '@/components/card-listings-table';
import { useIsMobile } from '@/hooks/use-mobile';
import { getAuctions } from '@/app/actions/getAuctions';
import { syncAllAuctions } from '@/app/actions/syncAuctions';
import { refreshAuctionBid } from '@/app/actions/refreshAuctionBid';
import { getCard } from '@/app/actions/getCard';
import { invalidateListing } from '@/app/actions/invalidateListing';
import { invalidateSale } from '@/app/actions/invalidateSale';
import { syncCardListings, syncListing, syncCardSales } from '@/app/actions/syncCard';
import { invalidateAuction, editAuctionGrade } from '@/app/actions/moderateAuction';

type Auction = GetAuctionsResponse[number];

const eur = (n: number) => `€${n.toFixed(0)}`;

// "as of" label for a stored bid: relative when recent, else a short clock time.
const formatAsOf = (iso: string | Date) => {
  const then = new Date(iso).getTime();
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  return new Date(then).toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

function SortHeader({
  label,
  onClick,
  align = 'left',
}: {
  label: string;
  onClick: () => void;
  align?: 'left' | 'right';
}) {
  // Ghost button pulls its own padding out so the label aligns with the cell
  // text edge: left columns hug the left padding, right columns the right.
  return (
    <div className={align === 'right' ? 'flex justify-end' : ''}>
      <Button
        variant="ghost"
        className={`h-8 ${align === 'right' ? '-mr-3' : '-ml-3'}`}
        onClick={onClick}
      >
        {label}
        <ArrowUpDown className="ml-1.5 size-3.5" />
      </Button>
    </div>
  );
}

export function AuctionsList({ auctions }: { auctions: GetAuctionsResponse }) {
  const isMobile = useIsMobile();
  const [data, setData] = useState<Auction[]>(auctions);
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'endTime', desc: false },
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 });
  const [refreshing, setRefreshing] = useState<Record<string, boolean>>({});
  const [syncingAll, setSyncingAll] = useState(false);
  const [grade, setGrade] = useState('all');

  // ── side panel ──────────────────────────────────────────────────────────
  const [panelOpen, setPanelOpen] = useState(false);
  const [displayedAuction, setDisplayedAuction] = useState<Auction | null>(null);
  const [displayedCard, setDisplayedCard] = useState<GetCardResponse | null>(null);
  const [spotlightOpen, setSpotlightOpen] = useState(false);
  const [panelSyncing, setPanelSyncing] = useState(false);
  const activeRef = useRef<Auction | null>(null);
  const loadingIdRef = useRef<string | null>(null);

  const updateRow = (id: string, patch: Partial<Auction>) =>
    setData((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));

  const onRefresh = async (id: string) => {
    setRefreshing((r) => ({ ...r, [id]: true }));
    try {
      const res = await refreshAuctionBid(id);
      if (res.removed) {
        setData((prev) => prev.filter((a) => a.id !== id));
      } else if (!res.unchanged) {
        updateRow(id, {
          currentBidEur: res.currentBidEur,
          bidCount: res.bidCount,
          bidCheckedAt: res.bidCheckedAt,
        });
      }
    } catch {
      /* leave row as-is on a failed refresh */
    } finally {
      setRefreshing((r) => ({ ...r, [id]: false }));
    }
  };

  const onInvalidate = async (id: string) => {
    setData((prev) => prev.filter((a) => a.id !== id));
    try {
      await invalidateAuction(id);
    } catch {
      await reload(); // restore on failure
    }
  };

  const onEditGrade = async (id: string, psaGrade: number) => {
    updateRow(id, { psaGrade });
    try {
      await editAuctionGrade(id, psaGrade);
    } catch {
      await reload();
    }
  };

  const reload = async () => setData(await getAuctions());

  const handleSyncAll = async () => {
    if (syncingAll) return;
    setSyncingAll(true);
    try {
      await syncAllAuctions();
      await reload();
    } catch (err) {
      console.error('Auction sync failed', err);
    } finally {
      setSyncingAll(false);
    }
  };

  const reloadCard = useCallback(async (cardId: string, forId: string) => {
    const data = await getCard(cardId);
    if (loadingIdRef.current === forId) setDisplayedCard(data);
  }, []);

  const openPanel = useCallback(
    async (auction: Auction, isNavigation = false) => {
      activeRef.current = auction;
      loadingIdRef.current = auction.id;
      setDisplayedAuction(auction);
      if (!isNavigation) {
        setDisplayedCard(null);
        setPanelOpen(true);
      }
      try {
        const card = await getCard(auction.cardId);
        if (loadingIdRef.current === auction.id) setDisplayedCard(card);
      } catch (err) {
        console.error('Failed to load card detail', err);
      }
    },
    [],
  );

  const tableRef = useRef<{ rows: Auction[] } | null>(null);
  const navigateBy = useCallback(
    (delta: number) => {
      if (!activeRef.current || !tableRef.current) return;
      const rows = tableRef.current.rows;
      const idx = rows.findIndex((r) => r.id === activeRef.current!.id);
      if (idx === -1) return;
      const next = rows[idx + delta];
      if (next) openPanel(next, true);
    },
    [openPanel],
  );

  useEffect(() => {
    if (!panelOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      if (e.key === 'Escape' && spotlightOpen) {
        e.stopPropagation();
        setSpotlightOpen(false);
        return;
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        navigateBy(-1);
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        navigateBy(1);
      }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [panelOpen, spotlightOpen, navigateBy]);

  const handlePanelSyncSales = async () => {
    if (!displayedAuction || panelSyncing) return;
    setPanelSyncing(true);
    try {
      await syncCardSales(displayedAuction.cardId);
      await reloadCard(displayedAuction.cardId, displayedAuction.id);
    } finally {
      setPanelSyncing(false);
    }
  };

  const cardId = displayedAuction?.cardId;
  const cardActionId = displayedAuction?.id;
  const handleRemoveSale = async (saleId: string) => {
    await invalidateSale(saleId);
    if (cardId && cardActionId) await reloadCard(cardId, cardActionId);
  };
  const handleInvalidateListing = async (listingId: string) => {
    await invalidateListing(listingId);
    if (cardId && cardActionId) await reloadCard(cardId, cardActionId);
  };
  const handleSyncListing = async (listingId: string) => {
    await syncListing(listingId);
    if (cardId && cardActionId) await reloadCard(cardId, cardActionId);
  };
  const handleSyncCardListings = async () => {
    if (!cardId || !cardActionId) return;
    await syncCardListings(cardId);
    await reloadCard(cardId, cardActionId);
  };

  // ── columns ─────────────────────────────────────────────────────────────
  const columns = React.useMemo<ColumnDef<Auction>[]>(
    () => [
      {
        accessorKey: 'cardName',
        header: ({ column }) => (
          <SortHeader
            label="Card"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          />
        ),
        meta: { fill: true },
        cell: ({ row }) => {
          const a = row.original;
          return (
            <div className="flex items-center gap-3">
              {a.imageUrl ? (
                <div className="h-12 w-9 shrink-0">
                  <CardImage src={a.imageUrl} alt={a.cardName} />
                </div>
              ) : (
                <div className="bg-muted h-12 w-9 shrink-0 rounded" />
              )}
              <div className="flex min-w-0 flex-col">
                <span className="truncate font-medium">{a.cardName}</span>
                <span className="text-muted-foreground truncate text-xs">
                  {a.cardSetName}
                </span>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'psaGrade',
        size: 110,
        header: ({ column }) => (
          <SortHeader
            label="Grade"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          />
        ),
        cell: ({ row }) => <Badge variant="secondary">PSA {row.original.psaGrade}</Badge>,
        filterFn: (row, id, value) =>
          value === 'all' || row.getValue(id) === Number(value),
      },
      {
        accessorKey: 'currentBidEur',
        size: 150,
        header: ({ column }) => (
          <SortHeader
            label="Current bid"
            align="right"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          />
        ),
        cell: ({ row }) => (
          <div className="flex flex-col items-end">
            <span className="inline-flex items-center gap-1 font-medium">
              <Gavel className="size-3.5 opacity-60" />
              {eur(row.original.currentBidEur)}
            </span>
            <span className="text-muted-foreground text-[10px]">
              {formatAsOf(row.original.bidCheckedAt)}
            </span>
          </div>
        ),
      },
      {
        accessorKey: 'bidCount',
        size: 90,
        header: ({ column }) => (
          <SortHeader
            label="Bids"
            align="right"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          />
        ),
        cell: ({ row }) => (
          <div className="text-right tabular-nums">{row.original.bidCount}</div>
        ),
      },
      {
        accessorKey: 'endTime',
        size: 130,
        header: ({ column }) => (
          <SortHeader
            label="Ends"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          />
        ),
        cell: ({ row }) => (
          <div className="whitespace-nowrap">
            <AuctionCountdown endTime={row.original.endTime} />
          </div>
        ),
      },
      {
        accessorKey: 'location',
        size: 150,
        header: 'Location',
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.location ?? '—'}</span>
        ),
      },
      {
        id: 'actions',
        size: 56,
        header: () => null,
        cell: ({ row }) => {
          const a = row.original;
          const busy = refreshing[a.id];
          return (
            <div onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground size-8"
                  >
                    {busy ? (
                      <RefreshCw className="size-3.5 animate-spin" />
                    ) : (
                      <MoreVertical className="size-4" />
                    )}
                    <span className="sr-only">Open menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem disabled={busy} onSelect={() => onRefresh(a.id)}>
                    <RefreshCw
                      className={`size-3.5${busy ? ' animate-spin' : ''}`}
                    />
                    Refresh bid
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <a href={a.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="size-3.5" />
                      Open on eBay
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <Pencil className="size-3.5" />
                      Edit grade
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((g) => (
                        <DropdownMenuItem
                          key={g}
                          disabled={g === a.psaGrade}
                          onSelect={() => onEditGrade(a.id, g)}
                        >
                          PSA {g}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => onInvalidate(a.id)}
                  >
                    <Trash2 className="size-3.5" />
                    Remove (invalid)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [refreshing],
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, pagination },
    getRowId: (row) => row.id,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  tableRef.current = {
    rows: table.getSortedRowModel().rows.map((r) => r.original),
  };

  const onGradeChange = (value: string) => {
    setGrade(value);
    table
      .getColumn('psaGrade')
      ?.setFilterValue(value === 'all' ? undefined : value);
  };

  return (
    <div className="flex w-full flex-col gap-4 px-4 lg:px-6">
      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={grade} onValueChange={onGradeChange}>
          <SelectTrigger size="sm" className="w-32">
            <SelectValue placeholder="Grade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All grades</SelectItem>
            {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((g) => (
              <SelectItem key={g} value={String(g)}>
                PSA {g}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          className={`ml-auto h-8 gap-1.5 shrink-0${syncingAll ? ' transition-none' : ''}`}
          disabled={syncingAll}
          onClick={handleSyncAll}
        >
          <RefreshCw className={`h-3.5 w-3.5${syncingAll ? ' animate-spin' : ''}`} />
          {syncingAll ? 'Syncing all…' : 'Sync all auctions'}
        </Button>
      </div>

      {/* table */}
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader className="from-primary/5 to-card dark:bg-card sticky top-0 z-10 bg-gradient-to-t shadow-xs backdrop-blur-md">
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header) => {
                  const fill = (
                    header.column.columnDef.meta as
                      | { fill?: boolean }
                      | undefined
                  )?.fill;
                  const size = header.getSize();
                  return (
                    <TableHead
                      key={header.id}
                      style={fill ? undefined : { width: size }}
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
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer"
                  onClick={() => openPanel(row.original)}
                >
                  {row.getVisibleCells().map((cell) => {
                    const fill = (
                      cell.column.columnDef.meta as
                        | { fill?: boolean }
                        | undefined
                    )?.fill;
                    const size = cell.column.getSize();
                    return (
                      <TableCell
                        key={cell.id}
                        style={fill ? undefined : { width: size, maxWidth: size }}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No ongoing auctions. Run an Auction Sync to populate the feed.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* pagination */}
      <div className="flex items-center justify-between">
        <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
          {table.getFilteredRowModel().rows.length} auction(s)
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
                {[20, 30, 50, 100, 250].map((ps) => (
                  <SelectItem key={ps} value={`${ps}`}>
                    {ps}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex w-fit items-center justify-center text-sm font-medium">
            Page {table.getState().pagination.pageIndex + 1} of{' '}
            {table.getPageCount() || 1}
          </div>
          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <IconChevronsLeft />
            </Button>
            <Button
              variant="outline"
              className="size-8"
              size="icon"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <IconChevronLeft />
            </Button>
            <Button
              variant="outline"
              className="size-8"
              size="icon"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <IconChevronRight />
            </Button>
            <Button
              variant="outline"
              className="hidden size-8 lg:flex"
              size="icon"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <IconChevronsRight />
            </Button>
          </div>
        </div>
      </div>

      {/* side panel */}
      {displayedAuction && (
        <Sheet open={panelOpen} onOpenChange={setPanelOpen}>
          <SheetContent
            side={isMobile ? 'bottom' : 'right'}
            className={`gap-6 p-10 ${!isMobile ? 'w-1/2' : ''} sm:w-[1400px] sm:max-w-[1400px]`}
          >
            <SheetHeader>
              <SheetTitle>{displayedAuction.cardName}</SheetTitle>
              <SheetDescription className="flex flex-wrap items-center gap-2">
                {displayedAuction.cardSetName}
                <Badge variant="secondary">PSA {displayedAuction.psaGrade}</Badge>
                <span className="inline-flex items-center gap-1">
                  <Gavel className="size-3.5 opacity-60" />
                  {eur(displayedAuction.currentBidEur)} · {displayedAuction.bidCount} bids
                </span>
                <AuctionCountdown endTime={displayedAuction.endTime} />
                <a
                  href={displayedAuction.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                >
                  eBay <ExternalLink className="size-3" />
                </a>
              </SheetDescription>
            </SheetHeader>

            {!isMobile && (
              <div className="flex items-stretch gap-6 px-4 lg:px-6">
                {displayedAuction.imageUrl && (
                  <CardImage
                    src={displayedAuction.imageUrl}
                    alt={displayedAuction.cardName}
                    spotlightOpen={spotlightOpen}
                    onSpotlightOpenChange={setSpotlightOpen}
                  />
                )}
                <div className="flex min-w-0 flex-1 flex-col gap-6">
                  <EbaySalesChart
                    sales={displayedCard?.sales ?? []}
                    cardId={displayedAuction.cardId}
                    onSyncEbay={handlePanelSyncSales}
                    isSyncingEbay={panelSyncing}
                    onRemoveSale={handleRemoveSale}
                  />
                </div>
              </div>
            )}

            {displayedCard && (
              <div className="w-full px-4 lg:px-6">
                <CardListingsTable
                  listings={displayedCard.listings}
                  onInvalidate={handleInvalidateListing}
                  onSyncListing={handleSyncListing}
                  onSyncAll={handleSyncCardListings}
                  isSyncingAll={false}
                />
              </div>
            )}
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
