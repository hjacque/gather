'use client';

import { useState } from 'react';
import { Ban, ExternalLink, Gavel, Loader2, ShoppingCart } from 'lucide-react';
import type { GetCardResponse } from '@gather/api-contract';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

// Asks keep their cents: unlike the rounded market medians, these are exact
// buyable prices.
const askPriceFmt = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
});

const SOURCE_LABELS: Record<GetCardResponse['listings'][number]['source'], string> = {
  ebay: 'eBay',
  cardmarket: 'CardMarket',
};

const PANEL_CARD_CLASS =
  '@container/card bg-gradient-to-t from-primary/5 to-card dark:bg-card backdrop-blur-md rounded-2xl border border-border p-6 shadow-xs w-full';

// Live-asks table for the card side panel: one row per active listing, grade
// ASC then price ASC (the API sorts; re-sorted here so the order survives any
// caller). Row titles expose the raw marketplace title for judging query
// mismatches by hand; `onInvalidate` flags a row that isn't this card, dropping
// it from the panel and the opportunities buy-side.
export function CardListingsTable({
  listings,
  onInvalidate,
}: {
  listings: GetCardResponse['listings'];
  onInvalidate?: (listingId: string) => void | Promise<void>;
}) {
  const [invalidatingId, setInvalidatingId] = useState<string | null>(null);

  const sorted = [...listings].sort(
    (a, b) => a.psaGrade - b.psaGrade || a.priceEur - b.priceEur
  );

  const handleInvalidate = async (listingId: string) => {
    if (!onInvalidate || invalidatingId) return;
    setInvalidatingId(listingId);
    try {
      await onInvalidate(listingId);
    } finally {
      setInvalidatingId(null);
    }
  };

  return (
    <Card className={PANEL_CARD_CLASS}>
      <CardHeader>
        <CardTitle>Live Listings</CardTitle>
        <CardDescription>
          Active Buy-It-Now asks from EU sellers, per grade
        </CardDescription>
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
                      {onInvalidate && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-muted-foreground hover:text-destructive"
                              disabled={invalidatingId === listing.id}
                              onClick={() => handleInvalidate(listing.id)}
                            >
                              {invalidatingId === listing.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Ban className="w-3.5 h-3.5" />
                              )}
                              <span className="sr-only">Invalidate listing</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            Not this card — hide from panel &amp; opportunities
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="flex items-center justify-center h-16 text-sm text-muted-foreground">
            No live listings — sync listings to populate
          </div>
        )}
      </CardContent>
    </Card>
  );
}
