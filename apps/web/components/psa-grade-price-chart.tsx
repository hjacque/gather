'use client';

import * as React from 'react';
import { Area, AreaChart, CartesianGrid, Legend, XAxis, YAxis } from 'recharts';
import type { PriceRecord } from '@gather/api-contract';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
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

const GRADE_COLORS: Record<number, string> = {
  1:  'hsl(220, 40%, 50%)',
  2:  'hsl(200, 45%, 48%)',
  3:  'hsl(175, 50%, 43%)',
  4:  'hsl(155, 50%, 40%)',
  5:  'hsl(135, 50%, 38%)',
  6:  'hsl(100, 52%, 38%)',
  7:  'hsl(75,  55%, 40%)',
  8:  'hsl(55,  65%, 42%)',
  9:  'hsl(42,  78%, 45%)',
  10: 'hsl(45,  90%, 50%)',
};

type Props = {
  psaGradePrices: PriceRecord[];
};

export function PsaGradePriceChart({ psaGradePrices }: Props) {
  const [timeRange, setTimeRange] = React.useState('90d');
  const [hiddenGrades, setHiddenGrades] = React.useState<Set<number>>(new Set());

  const currencyFormatter = React.useMemo(
    () => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }),
    []
  );
  const axisCurrencyFormatter = React.useMemo(
    () => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }),
    []
  );

  // Build chart data: one entry per date, columns psa1…psa10
  type ChartEntry = { date: string; [key: string]: number | null | string };

  const { chartData, gradesWithData } = React.useMemo(() => {
    const dateMap: Record<string, ChartEntry> = {};
    const gradeSet = new Set<number>();

    for (const record of psaGradePrices) {
      const grade = parseInt(record.type.replace('cardmarketPsa', ''), 10);
      if (isNaN(grade)) continue;
      gradeSet.add(grade);
      const key = record.date.toString().slice(0, 10);
      if (!dateMap[key]) dateMap[key] = { date: key };
      dateMap[key][`psa${String(grade).padStart(2, '0')}`] = record.value;
    }

    return {
      chartData: Object.values(dateMap).sort((a, b) =>
        a.date.localeCompare(b.date)
      ),
      gradesWithData: Array.from(gradeSet).sort((a, b) => a - b),
    };
  }, [psaGradePrices]);

  const filteredData = React.useMemo(() => {
    const days = timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 360;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return chartData.filter((entry) => new Date(entry.date) >= cutoff);
  }, [chartData, timeRange]);

  const toggleGrade = (grade: number) => {
    setHiddenGrades((prev) => {
      const next = new Set(prev);
      if (next.has(grade)) next.delete(grade);
      else next.add(grade);
      return next;
    });
  };

  const psaKey = (g: number) => `psa${String(g).padStart(2, '0')}`;

  const chartConfig = Object.fromEntries(
    gradesWithData.map((g) => [
      psaKey(g),
      { label: `PSA ${g}`, color: GRADE_COLORS[g] },
    ])
  );

  return (
    <Card className="@container/card bg-gradient-to-t from-primary/5 to-card dark:bg-card backdrop-blur-md rounded-2xl border border-border p-6 shadow-xs w-full">
      <CardHeader>
        <CardTitle>PSA Grade Prices</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">Lowest CardMarket listing per PSA grade</span>
          <span className="@[540px]/card:hidden">Per-grade prices</span>
        </CardDescription>
        {gradesWithData.length > 0 && <CardAction>
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={setTimeRange}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:!px-4 @[767px]/card:flex"
          >
            <ToggleGroupItem value="360d">Last year</ToggleGroupItem>
            <ToggleGroupItem value="90d">Last 3 months</ToggleGroupItem>
            <ToggleGroupItem value="30d">Last 30 days</ToggleGroupItem>
          </ToggleGroup>
          <Select value={timeRange} onValueChange={setTimeRange}>
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
        </CardAction>}
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {gradesWithData.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
            No grade price data — sync this product to populate
          </div>
        ) : (
        <ChartContainer config={chartConfig} className="w-full max-h-64">
          <AreaChart
            accessibilityLayer
            data={filteredData}
            margin={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <CartesianGrid vertical={false} stroke="var(--grid-line)" />
            <YAxis
              orientation="left"
              tickLine={false}
              axisLine={false}
              tickMargin={12}
              tick={{ fontSize: 12, fill: '#999' }}
              tickFormatter={(v) => axisCurrencyFormatter.format(v)}
            />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={12}
              tick={{ fontSize: 12, fill: '#999' }}
              tickFormatter={(v) =>
                new Date(v).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })
              }
            />
            <ChartTooltip
              cursor={{ stroke: 'var(--tooltip-cursor)', strokeWidth: 1 }}
              content={
                <ChartTooltipContent
                  indicator="line"
                  style={{ borderRadius: 8, boxShadow: '0 4px 10px rgba(0,0,0,0.08)' }}
                  valueFormatter={(value) => currencyFormatter.format(value as number)}
                />
              }
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
                        <svg width="16" height="4">
                          <line
                            x1="0" y1="2" x2="16" y2="2"
                            stroke={hidden ? '#666' : GRADE_COLORS[grade]}
                            strokeWidth="2.5"
                          />
                        </svg>
                        {`PSA ${grade}`}
                      </button>
                    );
                  })}
                </div>
              )}
            />
            {gradesWithData.map((grade) => (
              <Area
                key={grade}
                yAxisId={0}
                dataKey={psaKey(grade)}
                name={`PSA ${grade}`}
                type="monotone"
                stroke={GRADE_COLORS[grade]}
                fill={GRADE_COLORS[grade]}
                fillOpacity={0}
                strokeWidth={2.5}
                dot={false}
                hide={hiddenGrades.has(grade)}
                connectNulls
              />
            ))}
          </AreaChart>
        </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
