'use client';

import * as React from 'react';
import { ArrowUpDown, ExternalLink, Loader2, RefreshCw, ShoppingCart, Store, X } from 'lucide-react';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
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
import { syncAllPromos, syncProductCardMarket, syncProductPsa } from '@/app/actions/syncProduct';
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
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import type { GetProductsResponseItem } from '@/app/actions/getProducts';
import { ProductTable, RowActionsCell, type ProductTableHandle } from './product-table';

const ProductPanelContext = React.createContext<{
  openPanel: (item: GetProductsResponseItem) => void;
} | null>(null);

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
    accessorFn: (row) => row.cardmarketPsa9 ?? undefined,
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
    accessorFn: (row) => row.cardmarketPsa10 ?? undefined,
    sortUndefined: 'last',
    filterFn: (row, _columnId, filterValue: [number | null, number | null]) => {
      const [min, max] = filterValue;
      if (min == null && max == null) return true;
      const val = row.original.cardmarketPsa10;
      if (val == null) return false;
      if (min != null && val < min) return false;
      if (max != null && val > max) return false;
      return true;
    },
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
    filterFn: (row, _columnId, filterValue: [number | null, number | null]) => {
      const [min, max] = filterValue;
      if (min == null && max == null) return true;
      const val = row.original.psaTotal;
      if (val == null) return false;
      if (min != null && val < min) return false;
      if (max != null && val > max) return false;
      return true;
    },
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

function PsaPopSlider({
  label,
  color = 'default',
  dataMin,
  dataMax,
  committed,
  onCommit,
}: {
  label?: string;
  color?: 'default' | 'blue';
  dataMin: number;
  dataMax: number;
  committed: [number, number];
  onCommit: (values: [number, number]) => void;
}) {
  const [local, setLocal] = React.useState<[number, number]>(committed);
  const [minText, setMinText] = React.useState(String(committed[0]));
  const [maxText, setMaxText] = React.useState(String(committed[1]));
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    setLocal(committed);
    setMinText(String(committed[0]));
    setMaxText(String(committed[1]));
  }, [committed[0], committed[1]]);

  const schedule = (next: [number, number]) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onCommit(next), 300);
  };

  const handleSlider = (values: number[]) => {
    const next: [number, number] = [values[0], values[1]];
    setLocal(next);
    setMinText(String(next[0]));
    setMaxText(String(next[1]));
    schedule(next);
  };

  const handleMinInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMinText(e.target.value);
    const parsed = parseInt(e.target.value, 10);
    if (!isNaN(parsed)) {
      const clamped = Math.max(dataMin, Math.min(parsed, local[1]));
      const next: [number, number] = [clamped, local[1]];
      setLocal(next);
      schedule(next);
    }
  };

  const handleMaxInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMaxText(e.target.value);
    const parsed = parseInt(e.target.value, 10);
    if (!isNaN(parsed)) {
      const clamped = Math.min(dataMax, Math.max(parsed, local[0]));
      const next: [number, number] = [local[0], clamped];
      setLocal(next);
      schedule(next);
    }
  };

  const fieldWidth = `calc(${Math.max(String(dataMax).length, 2)}ch + 0.5rem)`;

  return (
    <div className="flex items-center gap-2 border rounded-md px-1 h-8">
      {label && <span className="text-xs text-muted-foreground shrink-0 pl-1">{label}</span>}
      <Input
        type="text"
        inputMode="numeric"
        value={minText}
        onChange={handleMinInput}
        onBlur={() => setMinText(String(local[0]))}
        style={{ width: fieldWidth }}
        className="h-6 shrink-0 border-0 shadow-none px-1 py-0 text-xs tabular-nums text-right focus-visible:ring-0"
      />
      <Slider
        min={dataMin}
        max={dataMax}
        step={1}
        value={local}
        onValueChange={handleSlider}
        className={`w-40${color === 'blue' ? ' [&_[data-slot=slider-range]]:bg-sidebar-accent [&_[data-slot=slider-thumb]]:border-sidebar-accent/50' : ''}`}
      />
      <Input
        type="text"
        inputMode="numeric"
        value={maxText}
        onChange={handleMaxInput}
        onBlur={() => setMaxText(String(local[1]))}
        style={{ width: fieldWidth }}
        className="h-6 shrink-0 border-0 shadow-none px-1 py-0 text-xs tabular-nums focus-visible:ring-0"
      />
    </div>
  );
}

export function PokemonExclusivePromosTable({
  dataPromise,
  pageSize = 10,
}: {
  dataPromise: Promise<GetProductsResponseItem[]>;
  pageSize?: number;
}) {
  const isMobile = useIsMobile();
  const [isSyncing, setIsSyncing] = React.useState(false);
  const tableRef = useRef<ProductTableHandle | null>(null);

  const [panelOpen, setPanelOpen] = useState(false);
  const [displayedItem, setDisplayedItem] = useState<GetProductsResponseItem | null>(null);
  const [displayedProduct, setDisplayedProduct] = useState<GetProductResponse | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [spotlightOpen, setSpotlightOpen] = useState(false);
  // Tracks nav position independently of what's displayed, and detects stale fetches
  const activeItemRef = useRef<GetProductsResponseItem | null>(null);
  const loadingIdRef = useRef<string | null>(null);

  const openPanel = useCallback(async (item: GetProductsResponseItem, isNavigation = false) => {
    activeItemRef.current = item;
    const loadId = item.id;
    loadingIdRef.current = loadId;

    if (!isNavigation) {
      // First open: show item header/image immediately, fetch details in background
      setDisplayedItem(item);
      setDisplayedProduct(null);
      setPanelOpen(true);
      setIsTransitioning(true);
    } else {
      // Navigation: keep old content fully visible, fetch next in background
      setIsTransitioning(true);
    }

    try {
      const data = await getProduct(item.id);
      if (loadingIdRef.current === loadId) {
        setDisplayedItem(item);
        setDisplayedProduct(data);
        setIsTransitioning(false);
      }
    } catch (err) {
      if (loadingIdRef.current === loadId) {
        console.error('Failed to load product detail', err);
        if (isNavigation) {
          setDisplayedItem(item);
          setDisplayedProduct(null);
        }
        setIsTransitioning(false);
      }
    }
  }, []);

  const navigateBy = useCallback((delta: number) => {
    if (!activeItemRef.current || !tableRef.current) return;
    const allRows = tableRef.current.getAllRows();
    const idx = allRows.findIndex((r) => r.id === activeItemRef.current!.id);
    if (idx === -1) return;
    const nextIdx = idx + delta;
    if (nextIdx < 0 || nextIdx >= allRows.length) return;
    const next = allRows[nextIdx];
    const nextPage = Math.floor(nextIdx / tableRef.current.pageSize);
    tableRef.current.goToPage(nextPage);
    openPanel(next, true);
  }, [openPanel]);

  useEffect(() => {
    if (!panelOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
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

  const handleSyncAll = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await syncAllPromos();
    } catch (err) {
      console.error('Sync failed', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const [panelSyncLoading, setPanelSyncLoading] = React.useState<'cardmarket' | 'psa' | null>(null);

  const handlePanelSync = async (action: 'cardmarket' | 'psa') => {
    if (!displayedItem || panelSyncLoading) return;
    const id = displayedItem.id;
    setPanelSyncLoading(action);
    try {
      const updatedItem = action === 'cardmarket'
        ? await syncProductCardMarket(id)
        : await syncProductPsa(id);
      if (activeItemRef.current?.id === id) {
        setDisplayedItem(updatedItem);
        const data = await getProduct(id);
        if (activeItemRef.current?.id === id) {
          setDisplayedProduct(data);
        }
      }
    } catch (err) {
      console.error('Panel sync failed', err);
    } finally {
      setPanelSyncLoading(null);
    }
  };

  const psaReport = displayedProduct?.psaPopReport ?? null;
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

  const handlePanelOpenChange = (next: boolean) => {
    setPanelOpen(next);
    if (!next) {
      setSpotlightOpen(false);
      loadingIdRef.current = null;
      setIsTransitioning(false);
    }
  };

  return (
    <ProductPanelContext.Provider value={{ openPanel }}>
      {displayedItem && (
        <Sheet open={panelOpen} onOpenChange={handlePanelOpenChange}>
          <SheetContent
            side={isMobile ? 'bottom' : 'right'}
            className={`p-10 gap-6 ${!isMobile ? 'w-1/2' : ''} sm:w-[1400px] sm:max-w-[1400px]`}
          >
            <SheetHeader>
              <SheetTitle>{displayedItem.name}</SheetTitle>
              <SheetDescription>
                {displayedItem.productSet.name}
                {displayedItem.number && ` #${displayedItem.number}/${displayedItem.productSet.code}`}
                {displayedItem.rarity && (
                  <Badge className="ml-2" variant="secondary">
                    {displayedItem.rarity.charAt(0).toUpperCase() + displayedItem.rarity.slice(1)}
                  </Badge>
                )}
                {displayedItem.regions?.map((region) => (
                  <Badge key={region} className="ml-1" variant="outline">
                    {({ japan: 'Japan', korea: 'Korea', taiwan_hong_kong: 'Taiwan & Hong Kong' } as Record<string, string>)[region] ?? region}
                  </Badge>
                ))}
              </SheetDescription>
            </SheetHeader>

            {!isMobile && (
              <div className="flex gap-6 items-stretch px-4 lg:px-6">
                {displayedItem.imageUrl && (
                  <ProductCardImage
                    src={displayedItem.imageUrl}
                    alt={displayedItem.name}
                    spotlightOpen={spotlightOpen}
                    onSpotlightOpenChange={setSpotlightOpen}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <PsaGradePriceChart
                    psaGradePrices={displayedProduct?.psaGradePrices ?? []}
                    onSyncCardMarket={() => handlePanelSync('cardmarket')}
                    isSyncingCardMarket={panelSyncLoading === 'cardmarket'}
                  />
                </div>
              </div>
            )}

            {displayedProduct && (
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
                    <CardAction>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePanelSync('psa')}
                        disabled={panelSyncLoading === 'psa'}
                        className="gap-1.5"
                      >
                        {panelSyncLoading === 'psa'
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <RefreshCw className="w-3.5 h-3.5" />}
                        Sync
                      </Button>
                    </CardAction>
                  </CardHeader>
                  <CardContent>
                    {grades ? (
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
                    ) : (
                      <div className="flex items-center justify-center h-16 text-sm text-muted-foreground">
                        No pop report data — sync this product to populate
                      </div>
                    )}
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
                    {displayedItem.cardMarketLink && (
                      <a href={displayedItem.cardMarketLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-xl bg-muted hover:bg-muted/70 transition-colors">
                        <ShoppingCart className="w-5 h-5 text-primary" />
                        <span className="text-sm font-medium">CardMarket</span>
                      </a>
                    )}
                    {displayedItem.tcgpLink && (
                      <a href={displayedItem.tcgpLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-xl bg-muted hover:bg-muted/70 transition-colors">
                        <ShoppingCart className="w-5 h-5 text-primary" />
                        <span className="text-sm font-medium">TCGPlayer</span>
                      </a>
                    )}
                    {displayedItem.cardkingdomBuyListLink && (
                      <a href={displayedItem.cardkingdomBuyListLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-xl bg-muted hover:bg-muted/70 transition-colors">
                        <Store className="w-5 h-5 text-primary" />
                        <span className="text-sm font-medium">Card Kingdom</span>
                      </a>
                    )}
                    {displayedItem.abugamesBuyListLink && (
                      <a href={displayedItem.abugamesBuyListLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-xl bg-muted hover:bg-muted/70 transition-colors">
                        <Store className="w-5 h-5 text-primary" />
                        <span className="text-sm font-medium">ABU Games</span>
                      </a>
                    )}
                    {displayedItem.psaLink && (
                      <a href={displayedItem.psaLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-xl bg-muted hover:bg-muted/70 transition-colors">
                        <ExternalLink className="w-5 h-5 text-primary" />
                        <span className="text-sm font-medium">PSA</span>
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
            <ProductNoteSection productId={displayedItem.id} initialNote={displayedItem.note} />
          </SheetContent>
        </Sheet>
      )}
      <ProductTable
        dataPromise={dataPromise}
        columns={columns}
        pageSize={pageSize}
        tableRef={tableRef}
        defaultSorting={[{ id: 'releaseDate', desc: true }, { id: 'number', desc: false }]}
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

        const psaValues = data.map((d) => d.psaTotal).filter((v): v is number => v != null);
        const psaDataMin = psaValues.length ? Math.min(...psaValues) : 0;
        const psaDataMax = psaValues.length ? Math.max(...psaValues) : 0;

        const psaPopFilter = (table.getColumn('psaTotal')?.getFilterValue() as [number | null, number | null]) ?? [null, null];
        const psaCommitted: [number, number] = [psaPopFilter[0] ?? psaDataMin, psaPopFilter[1] ?? psaDataMax];
        const onPsaCommit = (values: [number, number]) => {
          const [lo, hi] = values;
          if (lo === psaDataMin && hi === psaDataMax) {
            table.getColumn('psaTotal')?.setFilterValue(undefined);
          } else {
            table.getColumn('psaTotal')?.setFilterValue([lo, hi]);
          }
        };

        const psa10Prices = data.map((d) => d.cardmarketPsa10).filter((v): v is number => v != null);
        const psa10DataMin = psa10Prices.length ? Math.min(...psa10Prices) : 0;
        const psa10DataMax = psa10Prices.length ? Math.max(...psa10Prices) : 0;

        const psa10PriceFilter = (table.getColumn('cardmarketPsa10')?.getFilterValue() as [number | null, number | null]) ?? [null, null];
        const psa10Committed: [number, number] = [psa10PriceFilter[0] ?? psa10DataMin, psa10PriceFilter[1] ?? psa10DataMax];
        const onPsa10Commit = (values: [number, number]) => {
          const [lo, hi] = values;
          if (lo === psa10DataMin && hi === psa10DataMax) {
            table.getColumn('cardmarketPsa10')?.setFilterValue(undefined);
          } else {
            table.getColumn('cardmarketPsa10')?.setFilterValue([lo, hi]);
          }
        };

        const hasActiveFilters =
          selected.length > 0 ||
          selectedRegions.length > 0 ||
          psaPopFilter[0] != null ||
          psaPopFilter[1] != null ||
          psa10PriceFilter[0] != null ||
          psa10PriceFilter[1] != null;

        const clearAllFilters = () => {
          table.getColumn('set')?.setFilterValue(undefined);
          table.getColumn('regions')?.setFilterValue(undefined);
          table.getColumn('psaTotal')?.setFilterValue(undefined);
          table.getColumn('cardmarketPsa10')?.setFilterValue(undefined);
        };

        return (
          <div className="flex items-center justify-between gap-2">
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
            {psaDataMax > psaDataMin && (
              <PsaPopSlider
                label="Pop"
                color="blue"
                dataMin={psaDataMin}
                dataMax={psaDataMax}
                committed={psaCommitted}
                onCommit={onPsaCommit}
              />
            )}
            {psa10DataMax > psa10DataMin && (
              <PsaPopSlider
                label="PSA 10 €"
                dataMin={psa10DataMin}
                dataMax={psa10DataMax}
                committed={psa10Committed}
                onCommit={onPsa10Commit}
              />
            )}
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={clearAllFilters}>
                <X className="h-3.5 w-3.5" />
                Clear all
              </Button>
            )}
          </div>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={handleSyncAll}
            disabled={isSyncing}
          >
            <RefreshCw className={`h-4 w-4${isSyncing ? ' animate-spin' : ''}`} />
            <span className="sr-only">Sync all promos</span>
          </Button>
          </div>
        );
      }}
    />
    </ProductPanelContext.Provider>
  );
}

function ImageCell({ item }: { item: GetProductsResponseItem }) {
  const ctx = useContext(ProductPanelContext);

  if (!item.imageUrl) return null;
  return (
    <Tooltip disableHoverableContent>
      <TooltipTrigger asChild>
        <div className="flex justify-center cursor-pointer" onClick={() => ctx?.openPanel(item)}>
          <img src={item.imageUrl} alt="" className="h-10 w-auto object-contain rounded" />
        </div>
      </TooltipTrigger>
      <TooltipContent side="right" className="p-1 bg-transparent border-none shadow-none pointer-events-none">
        <img src={item.imageUrl} alt={item.name} className="h-64 w-auto object-contain rounded-lg shadow-xl" />
      </TooltipContent>
    </Tooltip>
  );
}

function TableCellViewer({ item }: { item: GetProductsResponseItem }) {
  const ctx = useContext(ProductPanelContext);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="link" className="text-foreground w-full max-w-full px-0 text-left truncate block" onClick={() => ctx?.openPanel(item)}>
          {item.name}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{item.name}</p>
      </TooltipContent>
    </Tooltip>
  );
}
