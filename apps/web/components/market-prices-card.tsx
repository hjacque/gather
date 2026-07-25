'use client';

import type {
  GetCardResponse,
  PsaPopReportSummary,
} from '@gather/api-contract';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const FREQUENCY_UNITS = [
  { perDay: 1, label: '/day' },
  { perDay: 7, label: '/wk' },
  { perDay: 30.44, label: '/mo' },
  { perDay: 365.25, label: '/yr' },
];

const formatSalesFrequency = (salesPerDay: number) => {
  const unit =
    FREQUENCY_UNITS.find((u) => salesPerDay * u.perDay >= 1) ??
    FREQUENCY_UNITS[FREQUENCY_UNITS.length - 1];
  const v = salesPerDay * unit.perDay;
  return `${v >= 10 ? Math.round(v) : Math.round(v * 10) / 10}${unit.label}`;
};

const marketPriceFmt = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

const POP_TEXT_CLASS = 'text-sky-600 dark:text-sky-400';

const CARD_CLASS =
  '@container/card bg-gradient-to-t from-primary/5 to-card dark:bg-card backdrop-blur-md rounded-2xl border border-border p-6 shadow-xs w-full';

const popByGrade = (report: PsaPopReportSummary | null) =>
  new Map<number, number | null>([
    [1, report?.grade1 ?? null],
    [2, report?.grade2 ?? null],
    [3, report?.grade3 ?? null],
    [4, report?.grade4 ?? null],
    [5, report?.grade5 ?? null],
    [6, report?.grade6 ?? null],
    [7, report?.grade7 ?? null],
    [8, report?.grade8 ?? null],
    [9, report?.grade9 ?? null],
    [10, report?.grade10 ?? null],
  ]);

export function MarketPricesCard({
  marketPrices,
  psaPopReport,
  onSyncSales,
  isSyncingSales = false,
  onSyncPsa,
  isSyncingPsa = false,
}: {
  marketPrices: GetCardResponse['marketPrices'];
  psaPopReport: PsaPopReportSummary | null;
  onSyncSales?: () => void | Promise<void>;
  isSyncingSales?: boolean;
  onSyncPsa?: () => void | Promise<void>;
  isSyncingPsa?: boolean;
}) {
  const byGrade = new Map(marketPrices.map((r) => [r.psaGrade, r]));
  const pops = popByGrade(psaPopReport);
  const hasData = byGrade.size > 0 || psaPopReport !== null;

  const syncedAt = psaPopReport?.syncedAt
    ? new Date(psaPopReport.syncedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null;

  return (
    <Card className={CARD_CLASS}>
      <CardHeader>
        <CardTitle>Market Sale Prices</CardTitle>
        <CardDescription>
          Recency-weighted median of eBay sold prices per grade
        </CardDescription>
        {(onSyncSales || onSyncPsa) && (
          <CardAction>
            <div className="flex gap-2">
              {onSyncSales && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onSyncSales()}
                  disabled={isSyncingSales}
                  className="gap-1.5"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5${isSyncingSales ? ' animate-spin' : ''}`}
                  />
                  Sync sales
                </Button>
              )}
              {onSyncPsa && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onSyncPsa()}
                  disabled={isSyncingPsa}
                  className="gap-1.5"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5${isSyncingPsa ? ' animate-spin' : ''}`}
                  />
                  Sync PSA
                </Button>
              )}
            </div>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {hasData ? (
          <>
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((grade) => {
                const record = byGrade.get(grade);
                const pop = pops.get(grade) ?? null;
                return (
                  <div
                    key={grade}
                    className="flex flex-col items-center gap-1 p-2 rounded-lg bg-muted"
                  >
                    <span className="text-xs text-muted-foreground font-medium">
                      PSA {grade}
                    </span>
                    <span className="text-sm font-semibold">
                      {record ? marketPriceFmt.format(record.priceEur) : '—'}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {record ? formatSalesFrequency(record.salesPerDay) : ''}
                    </span>
                    <span
                      className={`text-[11px] font-semibold ${POP_TEXT_CLASS}`}
                    >
                      {pop != null ? String(pop) : '—'}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className={`mt-6 text-right text-xs ${POP_TEXT_CLASS}`}>
              Total PSA population
              {psaPopReport?.total != null ? `: ${psaPopReport.total}` : ''}
              {syncedAt ? ` · updated ${syncedAt}` : ''}
            </p>
          </>
        ) : (
          <div className="flex items-center justify-center h-16 text-sm text-muted-foreground">
            No data — sync eBay sales and PSA pop to populate
          </div>
        )}
      </CardContent>
    </Card>
  );
}
