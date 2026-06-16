'use client';

import * as React from 'react';
import {
  CartesianGrid,
  Legend,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { SaleRecord } from '@gather/api-contract';
import { ChartContainer } from '@/components/ui/chart';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
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
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Button } from '@/components/ui/button';
import { RefreshCw, X, ExternalLink, Trash2 } from 'lucide-react';
import { GRADE_COLORS } from '@/lib/grade-colors';

type Props = {
  sales: SaleRecord[];
  // Identity of the card being shown; changing it closes any pinned infobox.
  cardId?: string;
  onSyncEbay?: () => void;
  isSyncingEbay?: boolean;
  // Flag a sale as invalid; the parent should refetch so it drops off the graph.
  onRemoveSale?: (saleId: string) => Promise<void> | void;
};

type Point = {
  id: string;
  url: string;
  x: number; // soldAt epoch ms
  y: number; // price in EUR
  pending: boolean;
  bestOffer: boolean;
};

type PinnedPoint = Point & { grade: number };

export function EbaySalesChart({ sales, cardId, onSyncEbay, isSyncingEbay, onRemoveSale }: Props) {
  const [timeRange, setTimeRange] = React.useState('90d');
  const [hiddenGrades, setHiddenGrades] = React.useState<Set<number>>(new Set());
  // The dot the user clicked: its pixel position in the chart + the sale data.
  const [pinned, setPinned] = React.useState<{ cx: number; cy: number; point: PinnedPoint } | null>(null);
  const [removingId, setRemovingId] = React.useState<string | null>(null);

  // Switching cards reuses this component instance; drop a stale pinned infobox
  // so it doesn't linger over another card's graph.
  React.useEffect(() => {
    setPinned(null);
  }, [cardId]);

  const currencyFormatter = React.useMemo(
    () => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }),
    []
  );
  const axisCurrencyFormatter = React.useMemo(
    () => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }),
    []
  );

  const cutoff = React.useMemo(() => {
    const days = timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 360;
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.getTime();
  }, [timeRange]);

  // Group Sales into one point series per grade, within the selected window.
  const { pointsByGrade, gradesWithData } = React.useMemo(() => {
    const byGrade: Record<number, Point[]> = {};
    const gradeSet = new Set<number>();

    for (const sale of sales) {
      const x = new Date(sale.soldAt).getTime();
      if (x < cutoff) continue;
      const grade = sale.psaGrade;
      gradeSet.add(grade);
      if (!byGrade[grade]) byGrade[grade] = [];
      byGrade[grade].push({
        id: sale.id,
        url: sale.url,
        x,
        y: sale.priceEur,
        pending: sale.status === 'pending',
        bestOffer: sale.isBestOffer,
      });
    }

    return {
      pointsByGrade: byGrade,
      gradesWithData: Array.from(gradeSet).sort((a, b) => a - b),
    };
  }, [sales, cutoff]);

  // Both the time range and grade visibility reflow the chart, so any pinned
  // infobox's pixel coordinates go stale — close it on either change.
  const handleTimeRangeChange = (value: string) => {
    setPinned(null);
    setTimeRange(value);
  };

  const toggleGrade = (grade: number) => {
    setPinned(null);
    setHiddenGrades((prev) => {
      const next = new Set(prev);
      if (next.has(grade)) next.delete(grade);
      else next.add(grade);
      return next;
    });
  };

  const handleRemove = async (saleId: string) => {
    if (!onRemoveSale || removingId) return;
    setRemovingId(saleId);
    try {
      await onRemoveSale(saleId);
      setPinned(null);
    } catch (err) {
      console.error('Failed to invalidate sale', err);
    } finally {
      setRemovingId(null);
    }
  };

  const chartConfig = Object.fromEntries(
    gradesWithData.map((g) => [`psa${g}`, { label: `PSA ${g}`, color: GRADE_COLORS[g] }])
  );

  const hasData = gradesWithData.length > 0;

  return (
    <Card className="@container/card bg-gradient-to-t from-primary/5 to-card dark:bg-card backdrop-blur-md rounded-2xl border border-border p-6 shadow-xs w-full">
      <CardHeader>
        <CardTitle>eBay Sales</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">Confirmed and pending eBay sold prices per PSA grade</span>
          <span className="@[540px]/card:hidden">Sold prices per grade</span>
        </CardDescription>
        {(onSyncEbay || hasData) && (
          <CardAction>
            <div className="flex items-center gap-2">
              {onSyncEbay && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onSyncEbay}
                  disabled={isSyncingEbay}
                  className="gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5${isSyncingEbay ? ' animate-spin' : ''}`} />
                  Sync
                </Button>
              )}
              {hasData && (
                <>
                  <ToggleGroup
                    type="single"
                    value={timeRange}
                    onValueChange={handleTimeRangeChange}
                    variant="outline"
                    className="hidden *:data-[slot=toggle-group-item]:!px-4 @[767px]/card:flex"
                  >
                    <ToggleGroupItem value="360d">Last year</ToggleGroupItem>
                    <ToggleGroupItem value="90d">Last 3 months</ToggleGroupItem>
                    <ToggleGroupItem value="30d">Last 30 days</ToggleGroupItem>
                  </ToggleGroup>
                  <Select value={timeRange} onValueChange={handleTimeRangeChange}>
                    <SelectTrigger
                      className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
                      size="sm"
                      aria-label="Select a value"
                    >
                      <SelectValue placeholder="Last 3 months" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="360d" className="rounded-lg">Last year</SelectItem>
                      <SelectItem value="90d" className="rounded-lg">Last 3 months</SelectItem>
                      <SelectItem value="30d" className="rounded-lg">Last 30 days</SelectItem>
                    </SelectContent>
                  </Select>
                </>
              )}
            </div>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {!hasData ? (
          <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
            No sales data — sync this card to populate
          </div>
        ) : (
          <div className="relative" onClick={() => setPinned(null)}>
          <ChartContainer config={chartConfig} className="w-full max-h-64 [&_*]:outline-hidden [&_*:focus]:outline-none [&_*:focus-visible]:outline-none">
            <ScatterChart margin={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <CartesianGrid stroke="var(--grid-line)" />
              <XAxis
                type="number"
                dataKey="x"
                domain={[cutoff, Date.now()]}
                tickLine={false}
                axisLine={false}
                tickMargin={12}
                tick={{ fontSize: 12, fill: '#999' }}
                tickFormatter={(v) =>
                  new Date(v).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                }
              />
              <YAxis
                type="number"
                dataKey="y"
                orientation="left"
                tickLine={false}
                axisLine={false}
                tickMargin={12}
                tick={{ fontSize: 12, fill: '#999' }}
                tickFormatter={(v) => axisCurrencyFormatter.format(v as number)}
              />
              <Tooltip
                cursor={false}
                content={({ active, payload }) => {
                  // While a dot is pinned the persistent infobox takes over;
                  // suppress the hover tooltip so we don't stack two boxes.
                  if (pinned) return null;
                  if (!active || !payload || payload.length === 0) return null;
                  const p = payload[0].payload as Point & { grade: number };
                  return (
                    <div className="rounded-lg border bg-background px-3 py-2 text-xs shadow-md">
                      <div className="font-medium">PSA {p.grade}</div>
                      <div>{currencyFormatter.format(p.y)}</div>
                      <div className="text-muted-foreground">
                        {new Date(p.x).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                        {p.pending ? ' · pending' : ''}
                      </div>
                    </div>
                  );
                }}
              />
              <Legend
                content={() => (
                  <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 pt-2">
                    {gradesWithData.map((grade) => {
                      const hidden = hiddenGrades.has(grade);
                      return (
                        <button
                          key={grade}
                          onClick={() => toggleGrade(grade)}
                          className="flex items-center gap-1.5 text-xs"
                          style={{ color: hidden ? '#666' : undefined }}
                        >
                          <svg width="10" height="10">
                            <circle cx="5" cy="5" r="4" fill={hidden ? '#666' : GRADE_COLORS[grade]} />
                          </svg>
                          {`PSA ${grade}`}
                        </button>
                      );
                    })}
                  </div>
                )}
              />
              {gradesWithData.map((grade) => (
                <Scatter
                  key={grade}
                  name={`PSA ${grade}`}
                  data={pointsByGrade[grade].map((p) => ({ ...p, grade }))}
                  fill={GRADE_COLORS[grade]}
                  hide={hiddenGrades.has(grade)}
                  shape={(props: any) => {
                    const isPinned = pinned?.point.id === props.payload.id;
                    return (
                      <g
                        tabIndex={-1}
                        style={{ cursor: 'pointer', outline: 'none' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setPinned({ cx: props.cx, cy: props.cy, point: props.payload });
                        }}
                      >
                        {/* Enlarged transparent hit target for easier clicking. */}
                        <circle cx={props.cx} cy={props.cy} r={10} fill="transparent" />
                        {isPinned && (
                          <circle
                            cx={props.cx}
                            cy={props.cy}
                            r={7}
                            fill="none"
                            stroke={GRADE_COLORS[grade]}
                            strokeWidth={1.5}
                            strokeOpacity={0.5}
                          />
                        )}
                        <circle
                          cx={props.cx}
                          cy={props.cy}
                          r={4}
                          fill={GRADE_COLORS[grade]}
                          fillOpacity={props.payload.pending ? 0.3 : 1}
                          stroke={GRADE_COLORS[grade]}
                          strokeOpacity={props.payload.pending ? 0.6 : 1}
                          strokeWidth={props.payload.pending ? 1 : 0}
                        />
                      </g>
                    );
                  }}
                />
              ))}
            </ScatterChart>
          </ChartContainer>
          {pinned && (
            <div
              className="absolute z-20 w-48 rounded-lg border bg-background px-3 py-2 text-xs shadow-md"
              style={{
                left: pinned.cx,
                top: pinned.cy + (pinned.cy < 120 ? 12 : -12),
                transform: pinned.cy < 120 ? 'translate(-50%, 0)' : 'translate(-50%, -100%)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="font-medium">PSA {pinned.point.grade}</div>
                <button
                  onClick={() => setPinned(null)}
                  className="-mr-1 -mt-0.5 text-muted-foreground hover:text-foreground"
                  aria-label="Close"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div>{currencyFormatter.format(pinned.point.y)}</div>
              <div className="text-muted-foreground">
                {new Date(pinned.point.x).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                {pinned.point.pending ? ' · pending' : ''}
              </div>
              {pinned.point.bestOffer && (
                <div className="text-muted-foreground">Best Offer accepted</div>
              )}
              <div className="mt-2 flex items-center justify-between gap-2">
                <a
                  href={pinned.point.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  View on eBay
                </a>
                {onRemoveSale && (
                  <button
                    onClick={() => handleRemove(pinned.point.id)}
                    disabled={removingId === pinned.point.id}
                    className="inline-flex items-center gap-1 text-destructive hover:underline disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {removingId === pinned.point.id ? 'Removing…' : 'Remove'}
                  </button>
                )}
              </div>
            </div>
          )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
