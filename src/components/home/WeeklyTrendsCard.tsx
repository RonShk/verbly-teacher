'use client'

import { BarChart, Bar, LineChart, Line, YAxis } from 'recharts'

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import type { DashboardTrends, TrendsRange } from '@/types/dashboard'

const TREND_RANGES: { id: TrendsRange; label: string }[] = [
  { id: 'this_week', label: 'This Week' },
  { id: 'last_week', label: 'Last Week' },
  { id: 'last_month', label: 'Last Month' },
]

const VOCAB_CONFIG = { cards: { label: 'Cards reviewed', color: '#8DCEF9' } } satisfies ChartConfig
const PRODUCTION_CONFIG = { score: { label: 'Accuracy', color: '#8DCEF9' } } satisfies ChartConfig
const TRANSLATION_CONFIG = { score: { label: 'Accuracy', color: '#1dae75' } } satisfies ChartConfig

function pointLabel(payload: { payload?: Record<string, unknown> }[]): string {
  return (payload[0]?.payload?.label as string) ?? ''
}

function TrendPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-background/40">
      <span className="px-4 pt-3.5 text-sm font-semibold text-foreground">{title}</span>
      <div className="h-36 px-2 pb-2 pt-1">{children}</div>
    </div>
  )
}

function EmptyTrend({ message }: { message: string }) {
  return (
    <div className="flex h-full items-center justify-center text-xs text-muted-foreground/60">
      {message}
    </div>
  )
}

function AccuracyLineChart({
  data,
  config,
  color,
}: {
  data: { label: string; score: number }[]
  config: ChartConfig
  color: string
}) {
  if (data.length < 2) return <EmptyTrend message="Not enough sessions yet" />
  return (
    <ChartContainer config={config} className="h-full w-full">
      <LineChart data={data} margin={{ top: 12, right: 12, left: 12, bottom: 8 }}>
        <YAxis domain={[0, 100]} hide />
        <ChartTooltip
          isAnimationActive={false}
          cursor={{ stroke: 'rgba(255,255,255,0.08)' }}
          content={<ChartTooltipContent labelFormatter={(_, p) => pointLabel(p)} />}
        />
        <Line
          type="monotone"
          dataKey="score"
          stroke={color}
          strokeWidth={2.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ChartContainer>
  )
}

export function WeeklyTrendsCard({
  trends,
  range,
  onRangeChange,
}: {
  trends: DashboardTrends | null
  range: TrendsRange
  onRangeChange: (r: TrendsRange) => void
}) {
  const series = trends?.[range] ?? null
  const hasVocabData = (series?.vocabPerDay ?? []).some((p) => p.cards > 0)

  return (
    <div className="flex flex-col rounded-xl border border-border bg-card p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-semibold text-foreground">Weekly Trends</h2>
        <div className="flex items-center gap-0.5 rounded-lg border border-border bg-[#1e1e1e] p-0.5">
          {TREND_RANGES.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => onRangeChange(id)}
              className={[
                'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                id === range
                  ? 'bg-[#0a0a0a] text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-4">
        <TrendPanel title="Vocab Cards / Day">
          {!series ? (
            <EmptyTrend message="Loading…" />
          ) : !hasVocabData ? (
            <EmptyTrend message="No reviews in this period" />
          ) : (
            <ChartContainer config={VOCAB_CONFIG} className="h-full w-full">
              <BarChart data={series.vocabPerDay} margin={{ top: 12, right: 8, left: 8, bottom: 4 }}>
                <ChartTooltip
                  isAnimationActive={false}
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                  content={<ChartTooltipContent labelFormatter={(_, p) => pointLabel(p)} />}
                />
                <Bar dataKey="cards" fill="#8DCEF9" radius={[3, 3, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ChartContainer>
          )}
        </TrendPanel>

        <TrendPanel title="Production Accuracy">
          {!series ? (
            <EmptyTrend message="Loading…" />
          ) : (
            <AccuracyLineChart data={series.production} config={PRODUCTION_CONFIG} color="#8DCEF9" />
          )}
        </TrendPanel>

        <TrendPanel title="Translation Accuracy">
          {!series ? (
            <EmptyTrend message="Loading…" />
          ) : (
            <AccuracyLineChart data={series.translation} config={TRANSLATION_CONFIG} color="#1dae75" />
          )}
        </TrendPanel>
      </div>
    </div>
  )
}
