'use client';

import type {
  GetOpportunitiesResponse,
  GradeOpportunity,
  OpportunityEntry,
  GetCardResponse,
  PsaPopReportSummary,
  SignalLevel,
} from '@gather/api-contract';
import { Badge } from '@/components/ui/badge';
import { TrendingDown, ExternalLink, Gavel, ShoppingCart } from 'lucide-react';
import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { CardImage } from '@/components/card-image';
import { EbaySalesChart } from '@/components/ebay-sales-chart';
import { PsaGradePriceChart } from '@/components/psa-grade-price-chart';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { CardNoteSection } from '@/components/card-note-section';
import { getCard } from '@/app/actions/getCard';
import { useIsMobile } from '@/hooks/use-mobile';

// ── helpers ──────────────────────────────────────────────────────────────────

const eur = (n: number | null) => (n === null ? '—' : `€${n.toFixed(0)}`);

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

const PANEL_CARD_CLASS =
  '@container/card bg-gradient-to-t from-primary/5 to-card dark:bg-card backdrop-blur-md rounded-2xl border border-border p-6 shadow-xs w-full';

// ── list ─────────────────────────────────────────────────────────────────────

type Props = { opportunities: GetOpportunitiesResponse };

export function OpportunitiesList({ opportunities }: Props) {
  const isMobile = useIsMobile();
  const [panelOpen, setPanelOpen] = useState(false);
  const [displayedOpp, setDisplayedOpp] = useState<OpportunityEntry | null>(null);
  const [displayedCard, setDisplayedCard] = useState<GetCardResponse | null>(null);
  const [spotlightOpen, setSpotlightOpen] = useState(false);
  const loadingIdRef = useRef<string | null>(null);
  const activeOppRef = useRef<OpportunityEntry | null>(null);

  const openPanel = useCallback(async (opp: OpportunityEntry, isNavigation = false) => {
    activeOppRef.current = opp;
    const loadId = opp.id;
    loadingIdRef.current = loadId;

    if (!isNavigation) {
      setDisplayedOpp(opp);
      setDisplayedCard(null);
      setPanelOpen(true);
    }

    try {
      const data = await getCard(opp.id);
      if (loadingIdRef.current === loadId) {
        setDisplayedOpp(opp);
        setDisplayedCard(data);
      }
    } catch (err) {
      if (loadingIdRef.current === loadId) {
        console.error('Failed to load card detail', err);
        if (isNavigation) {
          setDisplayedOpp(opp);
          setDisplayedCard(null);
        }
      }
    }
  }, []);

  const navigateBy = useCallback((delta: number) => {
    if (!activeOppRef.current) return;
    const idx = opportunities.findIndex(o => o.id === activeOppRef.current!.id);
    if (idx === -1) return;
    const nextIdx = idx + delta;
    if (nextIdx < 0 || nextIdx >= opportunities.length) return;
    openPanel(opportunities[nextIdx], true);
  }, [opportunities, openPanel]);

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

  const handlePanelOpenChange = (next: boolean) => {
    setPanelOpen(next);
    if (!next) {
      setSpotlightOpen(false);
      loadingIdRef.current = null;
    }
  };

  if (opportunities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <TrendingDown className="text-muted-foreground mb-3 h-10 w-10" />
        <p className="text-muted-foreground text-sm">No opportunities today.</p>
        <p className="text-muted-foreground text-xs">
          Check back once more sales data has accumulated.
        </p>
      </div>
    );
  }

  return (
    <>
      {displayedOpp && (
        <Sheet open={panelOpen} onOpenChange={handlePanelOpenChange}>
          <SheetContent
            side={isMobile ? 'bottom' : 'right'}
            className={`p-10 gap-6 ${!isMobile ? 'w-1/2' : ''} sm:w-[1400px] sm:max-w-[1400px]`}
          >
            <SheetHeader>
              <SheetTitle>{displayedOpp.name}</SheetTitle>
              <SheetDescription>
                {displayedOpp.cardSetName}
                {displayedCard?.number && ` · #${displayedCard.number}`}
                {` · PSA ${displayedOpp.bestGrade.psaGrade}`}
              </SheetDescription>
            </SheetHeader>

            {displayedCard ? (
              <>
                {!isMobile && (
                  <div className="flex gap-6 items-stretch px-4 lg:px-6">
                    {displayedCard.imageUrl && (
                      <CardImage
                        src={displayedCard.imageUrl}
                        alt={displayedCard.name}
                        spotlightOpen={spotlightOpen}
                        onSpotlightOpenChange={setSpotlightOpen}
                        foilPattern={displayedCard.foilPattern}
                      />
                    )}
                    <div className="flex-1 min-w-0 flex flex-col gap-6">
                      <EbaySalesChart
                        sales={displayedCard.sales}
                        cardId={displayedOpp.id}
                      />
                    </div>
                  </div>
                )}

                <div className="w-full px-4 lg:px-6">
                  <PsaGradePriceChart psaGradePrices={displayedCard.psaGradePrices} />
                </div>

                <div className="w-full px-4 lg:px-6">
                  <MarketPricesCard marketPrices={displayedCard.marketPrices} />
                </div>

                {displayedCard.psaPopReport && (
                  <div className="w-full px-4 lg:px-6">
                    <PsaPopCard report={displayedCard.psaPopReport} />
                  </div>
                )}

                <div className="w-full px-4 lg:px-6">
                  <Card className={PANEL_CARD_CLASS}>
                    <CardHeader>
                      <CardTitle>Card Links</CardTitle>
                      <CardDescription>Marketplaces & resources</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {displayedCard.cardMarketLink && (
                          <a
                            href={displayedCard.cardMarketLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-3 rounded-xl bg-muted hover:bg-muted/70 transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ShoppingCart className="w-5 h-5 text-primary" />
                            <span className="text-sm font-medium">CardMarket</span>
                          </a>
                        )}
                        {displayedCard.psaLink && (
                          <a
                            href={displayedCard.psaLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-3 rounded-xl bg-muted hover:bg-muted/70 transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="w-5 h-5 text-primary" />
                            <span className="text-sm font-medium">PSA</span>
                          </a>
                        )}
                        {displayedCard.ebayLink && (
                          <a
                            href={displayedCard.ebayLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-3 rounded-xl bg-muted hover:bg-muted/70 transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Gavel className="w-5 h-5 text-primary" />
                            <span className="text-sm font-medium">eBay Sold</span>
                          </a>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <CardNoteSection
                  key={displayedOpp.id}
                  cardId={displayedOpp.id}
                  initialNote={displayedCard.note}
                />
              </>
            ) : (
              <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
                Loading…
              </div>
            )}
          </SheetContent>
        </Sheet>
      )}

      <div className="flex flex-col gap-4">
        {opportunities.map((opp, i) => (
          <OpportunityCard
            key={opp.id}
            opportunity={opp}
            rank={i + 1}
            onOpen={openPanel}
          />
        ))}
      </div>
    </>
  );
}

// ── list item ─────────────────────────────────────────────────────────────────

function OpportunityCard({
  opportunity,
  rank,
  onOpen,
}: {
  opportunity: GetOpportunitiesResponse[number];
  rank: number;
  onOpen: (opp: OpportunityEntry) => void;
}) {
  const { bestGrade: g } = opportunity;

  return (
    <div
      className="bg-card border rounded-xl p-4 flex gap-4 cursor-pointer hover:bg-accent/50 transition-colors"
      onClick={() => onOpen(opportunity)}
    >
      {/* Thumbnail — plain img, no spotlight */}
      <div className="shrink-0 w-[80px]">
        {opportunity.imageUrl ? (
          <div
            className="aspect-[63/88] relative w-full overflow-hidden"
            style={{ borderRadius: '5.5% / 3.977%' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={opportunity.imageUrl}
              alt={opportunity.name}
              className="absolute inset-0 w-full h-full object-contain"
            />
          </div>
        ) : (
          <div className="aspect-[63/88] bg-muted rounded-md" />
        )}
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col gap-3 min-w-0">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-muted-foreground text-xs font-mono">#{rank}</span>
              <h2 className="font-semibold text-sm leading-tight">{opportunity.name}</h2>
              <Badge variant="secondary" className="text-xs shrink-0">
                PSA {g.psaGrade}
              </Badge>
            </div>
            <p className="text-muted-foreground text-xs mt-0.5">{opportunity.cardSetName}</p>
          </div>
          <ScoreBadge score={g.score} level={g.scoreLevel} />
        </div>

        {/* Signal breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-x-4 gap-y-2 pt-0.5">
          <DiscountCell g={g} />
          <WeekCell g={g} />
          <PopCell g={g} />
          <GradeCell g={g} />
          <AgeCell g={g} releaseDate={opportunity.releaseDate} />
        </div>
      </div>
    </div>
  );
}

// ── score badge ───────────────────────────────────────────────────────────────

const SCORE_LABEL: Record<SignalLevel, string> = {
  'green-strong': 'Strong',
  'yellow-light': 'Good',
  'orange-light': 'Fair',
  'red-strong':   'Weak',
};

const SCORE_BADGE_CLASS: Record<SignalLevel, string> = {
  'green-strong': 'bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400',
  'yellow-light': 'bg-yellow-50 dark:bg-yellow-950/30 text-yellow-600 dark:text-yellow-500',
  'orange-light': 'bg-orange-50 dark:bg-orange-950/30 text-orange-500 dark:text-orange-400',
  'red-strong':   'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-500',
};

function ScoreBadge({ score, level }: { score: number; level: SignalLevel }) {
  return (
    <div className={`shrink-0 flex items-baseline gap-1.5 px-2.5 py-1.5 rounded-lg ${SCORE_BADGE_CLASS[level]}`}>
      <span className="text-xl font-bold tabular-nums leading-none">{score.toFixed(0)}</span>
      <span className="text-xs font-semibold">{SCORE_LABEL[level]}</span>
    </div>
  );
}

// ── signal cells ──────────────────────────────────────────────────────────────

const SIGNAL_COLOR_CLASS: Record<SignalLevel, string> = {
  'green-strong': 'text-green-600 dark:text-green-400',
  'yellow-light': 'text-yellow-600 dark:text-yellow-500',
  'orange-light': 'text-orange-500 dark:text-orange-400',
  'red-strong':   'text-red-600 dark:text-red-500',
};

function SignalCell({
  label,
  value,
  sub,
  highlight = 'yellow-light',
}: {
  label: string;
  value: string;
  sub: string;
  highlight?: SignalLevel;
}) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </span>
      <span className={`text-sm font-semibold leading-snug truncate ${SIGNAL_COLOR_CLASS[highlight]}`}>
        {value}
      </span>
      <span className="text-[11px] text-muted-foreground leading-tight truncate">
        {sub}
      </span>
    </div>
  );
}

function DiscountCell({ g }: { g: GradeOpportunity }) {
  if (g.listingPrice === null) {
    return (
      <SignalCell label="Discount" value="No listing" sub={`Market ${eur(g.marketSalePrice)}`} highlight={g.listingLevel} />
    );
  }
  const pct = ((g.listingPrice - g.marketSalePrice) / g.marketSalePrice) * 100;
  return (
    <SignalCell
      label="Discount"
      value={`${pct > 0 ? '+' : ''}${pct.toFixed(0)}% vs market`}
      sub={`${eur(g.listingPrice)} listed · ${eur(g.marketSalePrice)} mkt`}
      highlight={g.listingLevel}
    />
  );
}

function WeekCell({ g }: { g: GradeOpportunity }) {
  if (g.yearLow === null || g.yearHigh === null) {
    return <SignalCell label="52-week" value="No history" sub="insufficient data" highlight={g.yearLevel} />;
  }
  const label =
    g.yearSignal >= 0.70 ? 'Near 52w low' :
    g.yearSignal >= 0.45 ? 'Mid 52w range' :
    g.yearSignal >= 0.20 ? 'Above mid range' :
                           'Near 52w high';
  return (
    <SignalCell
      label="52-week"
      value={label}
      sub={`Range ${eur(g.yearLow)} – ${eur(g.yearHigh)}`}
      highlight={g.yearLevel}
    />
  );
}

function PopCell({ g }: { g: GradeOpportunity }) {
  if (g.psaTotal === null) {
    return <SignalCell label="PSA Pop" value="No data" sub="sync PSA pop" highlight={g.populationLevel} />;
  }
  return (
    <SignalCell
      label="PSA Pop"
      value={g.psaTotal.toLocaleString()}
      sub="total graded"
      highlight={g.populationLevel}
    />
  );
}

function GradeCell({ g }: { g: GradeOpportunity }) {
  if (g.popsAtOrAbove === null || g.psaTotal === null || g.psaTotal === 0) {
    return <SignalCell label="Grade" value="No data" sub="sync PSA pop" highlight={g.gradeLevel} />;
  }
  const pct = (g.popsAtOrAbove / g.psaTotal) * 100;
  return (
    <SignalCell
      label="Grade"
      value={`${pct.toFixed(0)}% at PSA ${g.psaGrade}+`}
      sub={`${g.popsAtOrAbove}/${g.psaTotal} total`}
      highlight={g.gradeLevel}
    />
  );
}

function AgeCell({ g, releaseDate }: { g: GradeOpportunity; releaseDate: Date | string | null }) {
  const year = releaseDate ? new Date(releaseDate).getFullYear() : null;
  const age = year ? new Date().getFullYear() - year : null;
  return (
    <SignalCell
      label="Age"
      value={age != null ? `${age} years old` : 'Unknown'}
      sub={year ? `Released ${year}` : 'release date missing'}
      highlight={g.ageLevel}
    />
  );
}

// ── panel sub-components ──────────────────────────────────────────────────────

function MarketPricesCard({
  marketPrices,
}: {
  marketPrices: GetCardResponse['marketPrices'];
}) {
  const byGrade = new Map(marketPrices.map((r) => [r.psaGrade, r]));

  return (
    <Card className={PANEL_CARD_CLASS}>
      <CardHeader>
        <CardTitle>Market Sale Prices</CardTitle>
        <CardDescription>
          Recency-weighted median of eBay sold prices per grade
        </CardDescription>
      </CardHeader>
      <CardContent>
        {byGrade.size > 0 ? (
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((grade) => {
              const record = byGrade.get(grade);
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
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center justify-center h-16 text-sm text-muted-foreground">
            No sale data — sync eBay sales to populate
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PsaPopCard({ report }: { report: PsaPopReportSummary }) {
  const grades = [
    { grade: 1, count: report.grade1 },
    { grade: 2, count: report.grade2 },
    { grade: 3, count: report.grade3 },
    { grade: 4, count: report.grade4 },
    { grade: 5, count: report.grade5 },
    { grade: 6, count: report.grade6 },
    { grade: 7, count: report.grade7 },
    { grade: 8, count: report.grade8 },
    { grade: 9, count: report.grade9 },
    { grade: 10, count: report.grade10 },
  ];

  return (
    <Card className={PANEL_CARD_CLASS}>
      <CardHeader>
        <CardTitle>PSA Pop Report</CardTitle>
        <CardDescription>
          Grade distribution ·{' '}
          {report.syncedAt
            ? `Updated ${new Date(report.syncedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}`
            : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-5 sm:grid-cols-11 gap-2">
          {grades.map(({ grade, count }) => (
            <div
              key={grade}
              className="flex flex-col items-center gap-1 p-2 rounded-lg bg-muted"
            >
              <span className="text-xs text-muted-foreground font-medium">
                PSA {grade}
              </span>
              <span className="text-sm font-semibold">
                {count != null ? count.toLocaleString() : '—'}
              </span>
            </div>
          ))}
          <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-primary/10">
            <span className="text-xs text-muted-foreground font-medium">Total</span>
            <span className="text-sm font-semibold">
              {report.total != null ? report.total.toLocaleString() : '—'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
