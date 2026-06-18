'use client';

import type { GetAuctionsResponse } from '@gather/api-contract';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { CardImage } from '@/components/card-image';
import { AuctionCountdown } from '@/components/auction-countdown';
import { refreshAuctionBid } from '@/app/actions/refreshAuctionBid';
import { ExternalLink, Gavel, RefreshCw } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

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

type Row = GetAuctionsResponse[number] & { removed?: boolean };

export function AuctionsList({ auctions }: { auctions: GetAuctionsResponse }) {
  const [rows, setRows] = useState<Row[]>(auctions);
  const [refreshing, setRefreshing] = useState<Record<string, boolean>>({});

  const onRefresh = async (id: string) => {
    setRefreshing((r) => ({ ...r, [id]: true }));
    try {
      const res = await refreshAuctionBid(id);
      setRows((prev) =>
        prev.flatMap((row) => {
          if (row.id !== id) return [row];
          if (res.removed) return [];
          if (res.unchanged) return [row];
          return [
            {
              ...row,
              currentBidEur: res.currentBidEur ?? row.currentBidEur,
              bidCount: res.bidCount ?? row.bidCount,
              bidCheckedAt: res.bidCheckedAt ?? row.bidCheckedAt,
            },
          ];
        }),
      );
    } catch {
      // Leave the row as-is on a failed refresh.
    } finally {
      setRefreshing((r) => ({ ...r, [id]: false }));
    }
  };

  if (rows.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No ongoing auctions. Run an Auction Sync to populate the feed.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Card</TableHead>
          <TableHead>Grade</TableHead>
          <TableHead className="text-right">Current bid</TableHead>
          <TableHead className="text-right">Bids</TableHead>
          <TableHead>Ends</TableHead>
          <TableHead>Location</TableHead>
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((a) => (
          <TableRow key={a.id}>
            <TableCell>
              <div className="flex items-center gap-3">
                {a.imageUrl ? (
                  <div className="h-12 w-9 shrink-0">
                    <CardImage src={a.imageUrl} alt={a.cardName} />
                  </div>
                ) : (
                  <div className="bg-muted h-12 w-9 shrink-0 rounded" />
                )}
                <div className="flex flex-col">
                  <span className="font-medium">{a.cardName}</span>
                  <span className="text-muted-foreground text-xs">
                    {a.cardSetName}
                  </span>
                </div>
              </div>
            </TableCell>
            <TableCell>
              <Badge variant="secondary">PSA {a.psaGrade}</Badge>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex flex-col items-end">
                <span className="inline-flex items-center gap-1 font-medium">
                  <Gavel className="size-3.5 opacity-60" />
                  {eur(a.currentBidEur)}
                </span>
                <span className="text-muted-foreground text-[10px]">
                  {formatAsOf(a.bidCheckedAt)}
                </span>
              </div>
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {a.bidCount}
            </TableCell>
            <TableCell className="whitespace-nowrap">
              <AuctionCountdown endTime={a.endTime} />
            </TableCell>
            <TableCell className="text-muted-foreground">
              {a.location ?? '—'}
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onRefresh(a.id)}
                  disabled={refreshing[a.id]}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-40"
                  aria-label="Refresh current bid"
                  title="Refresh current bid"
                >
                  <RefreshCw
                    className={`size-4 ${refreshing[a.id] ? 'animate-spin' : ''}`}
                  />
                </button>
                <a
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground inline-flex"
                  aria-label="Open auction on eBay"
                >
                  <ExternalLink className="size-4" />
                </a>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
