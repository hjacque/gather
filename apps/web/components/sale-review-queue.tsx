'use client';

import * as React from 'react';
import type {
  GetUnreviewedSalesResponse,
  ReviewSaleRecord,
  UnreviewedSalesCard,
} from '@gather/api-contract';
import { getUnreviewedSales } from '@/app/actions/getUnreviewedSales';
import { approveSale } from '@/app/actions/approveSale';
import { invalidateSale } from '@/app/actions/invalidateSale';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Check, ExternalLink, X } from 'lucide-react';

const GRADES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

type SaleEdits = { psaGrade?: number; price?: number };

type Props = {
  initial: GetUnreviewedSalesResponse;
  pageSize: number;
};

const dateFmt = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

function formatEur(value: number | null): string {
  if (value === null) return '—';
  return `€${value.toFixed(2)}`;
}

// eBay glues a hidden "Opens in a new window or tab" accessibility string onto
// its listing-link text, which the scraper captured into the title. Strip it.
function cleanTitle(title: string): string {
  return title.replace(/Opens in a new window or tab\s*$/i, '').trimEnd();
}

export function SaleReviewQueue({ initial, pageSize }: Props) {
  const [data, setData] = React.useState(initial);
  const [page, setPage] = React.useState(initial.page);
  const [loading, setLoading] = React.useState(false);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(data.totalCards / pageSize));

  const loadPage = React.useCallback(
    async (next: number) => {
      setLoading(true);
      try {
        const res = await getUnreviewedSales(next, pageSize);
        setData(res);
        setPage(next);
      } finally {
        setLoading(false);
      }
    },
    [pageSize],
  );

  // Both review outcomes (approve / invalidate) drop the Sale from the queue;
  // a Card disappears once its last reviewable Sale clears.
  const removeSale = (cardId: string, saleId: string) => {
    setData((prev) => {
      const cards = prev.cards
        .map((c) =>
          c.id === cardId
            ? { ...c, sales: c.sales.filter((s) => s.id !== saleId) }
            : c,
        )
        .filter((c) => c.sales.length > 0);
      return { ...prev, cards };
    });
  };

  const runReview = async (
    cardId: string,
    saleId: string,
    action: () => Promise<void>,
  ) => {
    setBusyId(saleId);
    try {
      await action();
      removeSale(cardId, saleId);
      // Let the sidebar badge refresh its unreviewed count.
      window.dispatchEvent(new CustomEvent('sale-reviewed'));
    } finally {
      setBusyId(null);
    }
  };

  const onApprove = (cardId: string, saleId: string, edits: SaleEdits) =>
    runReview(cardId, saleId, () => approveSale(saleId, edits));

  const onInvalidate = (cardId: string, saleId: string) =>
    runReview(cardId, saleId, () => invalidateSale(saleId));

  if (data.cards.length === 0) {
    return (
      <div className="text-muted-foreground py-16 text-center text-sm">
        Nothing left to review on this page. 🎉
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {data.cards.map((card) => (
        <SaleReviewCard
          key={card.id}
          card={card}
          busyId={busyId}
          onApprove={onApprove}
          onInvalidate={onInvalidate}
        />
      ))}

      <div className="flex items-center justify-between pt-2">
        <span className="text-muted-foreground text-sm">
          {data.totalCards} card{data.totalCards === 1 ? '' : 's'} with
          unreviewed sales · page {page} of {totalPages}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={loading || page <= 1}
            onClick={() => loadPage(page - 1)}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={loading || page >= totalPages}
            onClick={() => loadPage(page + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

function SaleReviewCard({
  card,
  busyId,
  onApprove,
  onInvalidate,
}: {
  card: UnreviewedSalesCard;
  busyId: string | null;
  onApprove: (cardId: string, saleId: string, edits: SaleEdits) => void;
  onInvalidate: (cardId: string, saleId: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          {card.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={card.imageUrl}
              alt={card.name}
              className="h-14 w-auto rounded-sm object-contain"
            />
          ) : null}
          <div>
            <CardTitle className="text-base">{card.name}</CardTitle>
            <p className="text-muted-foreground text-xs">
              {card.set}
              {card.number ? ` · #${card.number}` : ''} · {card.sales.length}{' '}
              unreviewed
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col divide-y">
        {card.sales.map((sale) => (
          <SaleReviewRow
            key={sale.id}
            sale={sale}
            busy={busyId === sale.id}
            onApprove={(edits) => onApprove(card.id, sale.id, edits)}
            onInvalidate={() => onInvalidate(card.id, sale.id)}
          />
        ))}
      </CardContent>
    </Card>
  );
}

function SaleReviewRow({
  sale,
  busy,
  onApprove,
  onInvalidate,
}: {
  sale: ReviewSaleRecord;
  busy: boolean;
  onApprove: (edits: SaleEdits) => void;
  onInvalidate: () => void;
}) {
  const [grade, setGrade] = React.useState(sale.psaGrade);

  const handleApprove = () => {
    const edits: SaleEdits = {};
    if (grade !== sale.psaGrade) edits.psaGrade = grade;
    onApprove(edits);
  };

  return (
    <div className="flex items-center gap-3 py-3 text-sm">
      <Select
        value={String(grade)}
        onValueChange={(v) => setGrade(Number(v))}
      >
        <SelectTrigger size="sm" className="w-24 shrink-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {GRADES.map((g) => (
            <SelectItem key={g} value={String(g)}>
              PSA {g}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <a
        href={sale.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-muted-foreground hover:text-foreground visited:text-blue-600 dark:visited:text-blue-400 flex min-w-0 flex-1 items-center gap-1"
        title={cleanTitle(sale.title)}
      >
        <span className="truncate">{cleanTitle(sale.title)}</span>
        <ExternalLink className="h-3 w-3 shrink-0" />
      </a>

      <div className="w-36 shrink-0 text-right tabular-nums">
        <div>
          {sale.price.toFixed(2)} {sale.currency}
        </div>
        <div className="text-muted-foreground text-xs">
          {formatEur(sale.priceEur)}
        </div>
      </div>

      <span className="text-muted-foreground w-24 shrink-0 text-right text-xs">
        {dateFmt.format(new Date(sale.soldAt))}
      </span>

      <div className="flex w-28 shrink-0 justify-end gap-1">
        {sale.status === 'pending' ? (
          <Badge variant="outline" className="text-xs">
            pending
          </Badge>
        ) : null}
      </div>

      <Button
        size="sm"
        variant="outline"
        className="shrink-0"
        disabled={busy}
        onClick={handleApprove}
      >
        <Check className="h-4 w-4" />
        Approve
      </Button>

      <Button
        size="sm"
        variant="ghost"
        className="text-destructive hover:text-destructive shrink-0"
        disabled={busy}
        onClick={onInvalidate}
        title="Flag as invalid (wrong card, bundle, mismatch)"
      >
        <X className="h-4 w-4" />
        Invalid
      </Button>
    </div>
  );
}
