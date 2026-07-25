'use client';

import { useMemo, useState } from 'react';
import {
  Ban,
  ChevronDown,
  ExternalLink,
  Gavel,
  Loader2,
  MoreVertical,
  RefreshCw,
  ShoppingCart,
} from 'lucide-react';
import type { GetCardResponse } from '@gather/api-contract';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const askPriceFmt = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
});

type ListingSource = GetCardResponse['listings'][number]['source'];

const SOURCE_LABELS: Record<ListingSource, string> = {
  ebay: 'eBay',
  cardmarket: 'CardMarket',
};

function MultiSelectFilter<T extends string | number>({
  label,
  options,
  selected,
  onChange,
  renderOption,
}: {
  label: string;
  options: T[];
  selected: Set<T>;
  onChange: (next: Set<T>) => void;
  renderOption: (option: T) => string;
}) {
  const toggle = (option: T) => {
    const next = new Set(selected);
    if (next.has(option)) next.delete(option);
    else next.add(option);
    onChange(next);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          {label}
          {selected.size > 0 && (
            <Badge variant="secondary" className="px-1.5">
              {selected.size}
            </Badge>
          )}
          <ChevronDown className="w-3.5 h-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-72 overflow-auto">
        {options.map((option) => (
          <DropdownMenuCheckboxItem
            key={String(option)}
            checked={selected.has(option)}
            onCheckedChange={() => toggle(option)}
            onSelect={(event) => event.preventDefault()}
          >
            {renderOption(option)}
          </DropdownMenuCheckboxItem>
        ))}
        {selected.size > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onChange(new Set())}>
              Clear
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const PANEL_CARD_CLASS =
  '@container/card bg-gradient-to-t from-primary/5 to-card dark:bg-card backdrop-blur-md rounded-2xl border border-border p-6 shadow-xs w-full';

export function CardListingsTable({
  listings,
  onInvalidate,
  onInvalidateByItem,
  onSyncListing,
  onSyncAll,
  isSyncingAll = false,
}: {
  listings: GetCardResponse['listings'];
  onInvalidate?: (listingId: string) => void | Promise<void>;
  onInvalidateByItem?: (listingId: string) => void | Promise<void>;
  onSyncListing?: (listingId: string) => void | Promise<void>;
  onSyncAll?: () => void | Promise<void>;
  isSyncingAll?: boolean;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selectedSources, setSelectedSources] = useState<Set<ListingSource>>(
    new Set()
  );
  const [selectedGrades, setSelectedGrades] = useState<Set<number>>(new Set());

  const sourceOptions = useMemo(
    () =>
      (Object.keys(SOURCE_LABELS) as ListingSource[]).filter((source) =>
        listings.some((listing) => listing.source === source)
      ),
    [listings]
  );

  const gradeOptions = useMemo(
    () =>
      Array.from(new Set(listings.map((listing) => listing.psaGrade))).sort(
        (a, b) => a - b
      ),
    [listings]
  );

  const sorted = useMemo(
    () =>
      listings
        .filter(
          (listing) =>
            (selectedSources.size === 0 || selectedSources.has(listing.source)) &&
            (selectedGrades.size === 0 || selectedGrades.has(listing.psaGrade))
        )
        .sort((a, b) => a.psaGrade - b.psaGrade || a.priceEur - b.priceEur),
    [listings, selectedSources, selectedGrades]
  );

  const runRowAction = async (
    listingId: string,
    action?: (id: string) => void | Promise<void>
  ) => {
    if (!action || busyId) return;
    setBusyId(listingId);
    try {
      await action(listingId);
    } finally {
      setBusyId(null);
    }
  };

  const hasRowActions = !!onInvalidate || !!onInvalidateByItem || !!onSyncListing;

  return (
    <Card className={PANEL_CARD_CLASS}>
      <CardHeader>
        <CardTitle>Live Listings</CardTitle>
        <CardDescription>
          Live asks per grade — eBay EU Buy-It-Now + CardMarket
        </CardDescription>
        {(onSyncAll || listings.length > 0) && (
          <CardAction>
            <div className="flex items-center gap-2">
              {listings.length > 0 && (
                <>
                  <MultiSelectFilter
                    label="Source"
                    options={sourceOptions}
                    selected={selectedSources}
                    onChange={setSelectedSources}
                    renderOption={(source) => SOURCE_LABELS[source]}
                  />
                  <MultiSelectFilter
                    label="Grade"
                    options={gradeOptions}
                    selected={selectedGrades}
                    onChange={setSelectedGrades}
                    renderOption={(grade) => `PSA ${grade}`}
                  />
                </>
              )}
              {onSyncAll && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onSyncAll()}
                  disabled={isSyncingAll}
                  className="gap-1.5"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5${isSyncingAll ? ' animate-spin' : ''}`}
                  />
                  Sync
                </Button>
              )}
            </div>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {sorted.length > 0 ? (
          <div className="max-h-80 overflow-auto rounded-lg border border-border">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead>Grade</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-right">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((listing) => (
                  <TableRow key={listing.id} title={listing.title}>
                    <TableCell className="font-medium">
                      PSA {listing.psaGrade}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">
                      {askPriceFmt.format(listing.priceEur)}
                    </TableCell>
                    <TableCell>
                      {listing.isBestOffer ? (
                        <Badge variant="outline">
                          <Gavel />
                          Open to offer
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <ShoppingCart />
                          Buy now
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {SOURCE_LABELS[listing.source]}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button variant="ghost" size="sm" asChild>
                        <a
                          href={listing.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Open
                        </a>
                      </Button>
                      {hasRowActions && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-muted-foreground data-[state=open]:bg-muted"
                              disabled={busyId === listing.id}
                            >
                              {busyId === listing.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <MoreVertical className="w-3.5 h-3.5" />
                              )}
                              <span className="sr-only">Open listing actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {onSyncListing && (
                              <DropdownMenuItem
                                onSelect={() => runRowAction(listing.id, onSyncListing)}
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                                Sync
                              </DropdownMenuItem>
                            )}
                            {(onInvalidate || onInvalidateByItem) &&
                              onSyncListing && <DropdownMenuSeparator />}
                            {onInvalidate && (
                              <DropdownMenuItem
                                variant="destructive"
                                onSelect={() => runRowAction(listing.id, onInvalidate)}
                              >
                                <Ban className="w-3.5 h-3.5" />
                                Delete
                              </DropdownMenuItem>
                            )}
                            {onInvalidateByItem && (
                              <DropdownMenuItem
                                variant="destructive"
                                onSelect={() =>
                                  runRowAction(listing.id, onInvalidateByItem)
                                }
                              >
                                <Ban className="w-3.5 h-3.5" />
                                Delete all
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="flex items-center justify-center h-16 text-sm text-muted-foreground">
            {listings.length > 0
              ? 'No listings match the selected filters'
              : 'No live listings — sync listings to populate'}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
