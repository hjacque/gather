'use client';

import * as React from 'react';
import { useState } from 'react';
import Image from 'next/image';
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts';

import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
} from '@/components/ui/chart';
import { getProduct } from '@/app/actions/getProduct';
import type { GetProductResponse } from '@/app/actions/getProduct';

export function TableCellViewer({
  item,
}: {
  item: GetProductResponse;
}) {
  const isMobile = useIsMobile();
  const [chartData, setChartData] = useState<
    { date: string; market: number | null; buylist: number | null }[]
  >([]);

  const fetchChartData = async () => {
    try {
      const product = await getProduct(item.id);

      // Merge marketPrices and buylistPrices by date
      const dateMap: Record<
        string,
        { date: string; market: number | null; buylist: number | null }
      > = {};

      product.marketPrices?.forEach(({ date, value }) => {
        if (!dateMap[date.toString()])
          dateMap[date.toString()] = {
            date: date.toString(),
            market: null,
            buylist: null,
          };
        dateMap[date.toString()].market = value;
      });

      product.buylistPrices?.forEach(({ date, value }) => {
        if (!dateMap[date.toString()])
          dateMap[date.toString()] = {
            date: date.toString(),
            market: null,
            buylist: null,
          };
        dateMap[date.toString()].buylist = value;
      });

      const merged = Object.values(dateMap).sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );

      setChartData(merged);
    } catch (err) {
      console.error('Failed to load chart data', err);
    }
  };

  return (
    <Sheet onOpenChange={(open) => open && fetchChartData()}>
      <SheetTrigger asChild>
        <Button variant="link" className="text-foreground w-fit px-0 text-left">
          {item.name}
        </Button>
      </SheetTrigger>
      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        className={`${!isMobile ? 'w-1/2' : ''} sm:w-[1200px] sm:max-w-[1200px]`}
      >
        <SheetHeader>
          <SheetTitle>{`${item.name} - ${item.productSet.name}`}</SheetTitle>
          <SheetDescription>
            {!isMobile && (
              <>
                <div className="flex gap-4 items-start">
                  {item.imageUrl && (
                    <div className="shrink-0">
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        width={160}
                        height={220}
                        className="rounded-md object-contain"
                      />
                    </div>
                  )}
                  <ChartContainer
                    className="flex-1"
                    config={
                      {
                        desktop: {
                          label: 'Desktop',
                          color: 'var(--primary)',
                        },
                        mobile: {
                          label: 'Mobile',
                          color: 'var(--primary)',
                        },
                      } satisfies ChartConfig
                    }
                  >
                    <AreaChart data={chartData} margin={{ left: 0, right: 10 }}>
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        tickFormatter={(value) => value.slice(5)} // MM-DD
                      />
                      <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent indicator="dot" />}
                      />
                      <Area
                        dataKey="market"
                        name="Market Price"
                        type="monotone"
                        fill="var(--color-market)"
                        fillOpacity={0.4}
                        stroke="var(--color-market)"
                      />
                      <Area
                        dataKey="buylist"
                        name="Buylist Price"
                        type="monotone"
                        fill="var(--color-buylist)"
                        fillOpacity={0.4}
                        stroke="var(--color-buylist)"
                      />
                    </AreaChart>
                  </ChartContainer>
                </div>

                <Separator />
              </>
            )}
          </SheetDescription>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  );
}
