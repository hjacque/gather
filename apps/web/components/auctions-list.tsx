'use client';

import type { GetAuctionsResponse } from '@gather/api-contract';
import { Badge } from '@/components/ui/badge';
import { CardImage } from '@/components/card-image';
import { ExternalLink, Gavel } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const eur = (n: number) => `€${n.toFixed(0)}`;

// Absolute end instant rendered as a short local date+time. The live ticking
// countdown is a later slice; this already conveys urgency since the feed is
// ordered ending-soonest.
const formatEnd = (iso: string | Date) => {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export function AuctionsList({ auctions }: { auctions: GetAuctionsResponse }) {
  if (auctions.length === 0) {
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
        {auctions.map((a) => (
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
            <TableCell className="text-right font-medium">
              <span className="inline-flex items-center gap-1">
                <Gavel className="size-3.5 opacity-60" />
                {eur(a.currentBidEur)}
              </span>
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {a.bidCount}
            </TableCell>
            <TableCell className="whitespace-nowrap">
              {formatEnd(a.endTime)}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {a.location ?? '—'}
            </TableCell>
            <TableCell>
              <a
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground inline-flex"
                aria-label="Open auction on eBay"
              >
                <ExternalLink className="size-4" />
              </a>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
