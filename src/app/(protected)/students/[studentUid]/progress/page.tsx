'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList } from 'recharts'

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const PROGRESS_DAYS = [
  { short: 'MON', date: 19 },
  { short: 'TUE', date: 20 },
  { short: 'WED', date: 21 },
  { short: 'THU', date: 22 },
  { short: 'FRI', date: 23 },
  { short: 'SAT', date: 24 },
  { short: 'SUN', date: 25 },
]

// null = not attempted, -1 = done (vocab, no numeric score), number = score %
const PROGRESS_ROWS: { label: string; cells: (number | null)[] }[] = [
  { label: 'VOCAB',       cells: [null, -1,   -1,   -1,   -1,   -1,   -1  ] },
  { label: 'PRODUCTION',  cells: [null, null,  82,   54,   88,   71,   90  ] },
  { label: 'TRANSLATION', cells: [null, null, null,  91,   85,   78,   88  ] },
]

const DAILY_AVG: (number | null)[] = [null, null, 82, 73, 87, 75, 89]

const VOCAB_CHART_DATA = [
  { day: 'Mon', cards: 12 },
  { day: 'Tue', cards: 20 },
  { day: 'Wed', cards: 18 },
  { day: 'Thu', cards: 22 },
  { day: 'Fri', cards: 15 },
  { day: 'Sat', cards: 18 },
  { day: 'Sun', cards: 21 },
]

const VOCAB_CHART_CONFIG = {
  cards: { label: 'Cards reviewed', color: '#8DCEF9' },
} satisfies ChartConfig

const PRODUCTION_SCORES: { date: string; score: number }[] = [
  { date: 'May 25', score: 88 },
  { date: 'May 23', score: 54 },
  { date: 'May 21', score: 82 },
  { date: 'May 19', score: 71 },
  { date: 'May 17', score: 90 },
]

const TRANSLATION_SCORES: { date: string; score: number }[] = [
  { date: 'May 25', score: 88 },
  { date: 'May 23', score: 85 },
  { date: 'May 21', score: 78 },
  { date: 'May 19', score: 91 },
  { date: 'May 17', score: 92 },
]

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

// score: null = not attempted, -1 = vocab done (no numeric score), 0–100 = score %
function CalendarDot({ score }: { score: number | null }) {
  const SIZE = 22
  const STROKE = 2.5
  const r = (SIZE - STROKE) / 2
  const circ = 2 * Math.PI * r
  const cx = SIZE / 2
  const cy = SIZE / 2

  const targetPct = score === null ? 0 : score === -1 ? 1 : score / 100
  const [animatedPct, setAnimatedPct] = useState(0)
  useEffect(() => {
    if (score === null) return
    const id = setTimeout(() => setAnimatedPct(targetPct), 30)
    return () => clearTimeout(id)
  }, [score, targetPct])

  if (score === null) {
    return (
      <svg width={SIZE} height={SIZE}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={STROKE} />
      </svg>
    )
  }

  const dash = animatedPct * circ
  const label = score === -1 ? '100% Accuracy' : `${score}% Accuracy`

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <svg width={SIZE} height={SIZE} style={{ transform: 'rotate(-90deg)', cursor: 'default' }}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(141,206,249,0.15)" strokeWidth={STROKE} />
          <circle
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke="#8DCEF9"
            strokeWidth={STROKE}
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.65s ease-out' }}
          />
        </svg>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

function ScoreBar({ score }: { score: number }) {
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const id = setTimeout(() => setWidth(score), 0)
    return () => clearTimeout(id)
  }, [score])

  const low = score < 70
  return (
    <div className="flex items-center gap-3">
      <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-out"
          style={{ width: `${width}%`, backgroundColor: low ? '#E24B4A' : '#8DCEF9' }}
        />
      </div>
      <span
        className="w-9 shrink-0 text-right text-sm font-medium"
        style={{ color: low ? '#E24B4A' : '#f0f0f0' }}
      >
        {score}%
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ProgressPage() {
  const prodAvg = Math.round(PRODUCTION_SCORES.reduce((s, r) => s + r.score, 0) / PRODUCTION_SCORES.length)
  const transAvg = Math.round(TRANSLATION_SCORES.reduce((s, r) => s + r.score, 0) / TRANSLATION_SCORES.length)
  const transLow = Math.min(...TRANSLATION_SCORES.map((r) => r.score))
  const transHigh = Math.max(...TRANSLATION_SCORES.map((r) => r.score))
  const prodLow = Math.min(...PRODUCTION_SCORES.map((r) => r.score))
  const prodHigh = Math.max(...PRODUCTION_SCORES.map((r) => r.score))

  return (
    <div className="flex flex-col gap-5 p-8">
      {/* Practice activity card */}
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="flex items-start justify-between border-b border-border px-6 py-5">
          <div>
            <h2 className="text-xl font-bold font-heading text-foreground">Practice Activity</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">May 19 – May 25, 2024</p>
          </div>
        </div>

        {/* Week navigation */}
        <div className="flex items-center justify-between px-6 py-2.5">
          <button className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground">
            <ChevronLeft className="h-3.5 w-3.5" />
            Previous week
          </button>
          <button className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground">
            Next week
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Calendar grid */}
        <div className="px-6 py-4">
          <table className="w-full">
            <thead>
              <tr>
                <th className="w-36 pb-4 text-left" />
                {PROGRESS_DAYS.map((d) => (
                  <th
                    key={d.short}
                    className="pb-4 text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
                  >
                    {d.short} {d.date}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PROGRESS_ROWS.map((row) => (
                <tr key={row.label}>
                  <td className="py-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {row.label}
                  </td>
                  {row.cells.map((cell, i) => (
                    <td key={i} className="py-4 text-center">
                      <div className="flex justify-center">
                        <CalendarDot score={cell} />
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
              {/* Daily avg summary row */}
              <tr className="border-t border-border">
                <td className="py-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  DAILY AVG
                </td>
                {DAILY_AVG.map((avg, i) => (
                  <td key={i} className="py-4 text-center">
                    {avg !== null ? (
                      <span
                        className="text-xs font-semibold"
                        style={{ color: avg >= 70 ? '#1dae75' : '#E24B4A' }}
                      >
                        {avg}%
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground/60">—</span>
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-6 border-t border-border px-6 py-3">
          <div className="flex items-center gap-2">
            <svg width="14" height="14"><circle cx="7" cy="7" r="5.5" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="2" /></svg>
            <span className="text-xs text-muted-foreground">Not attempted</span>
          </div>
          <div className="flex items-center gap-2">
            <svg width="14" height="14" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="7" cy="7" r="5.5" fill="none" stroke="rgba(141,206,249,0.15)" strokeWidth="2" />
              <circle cx="7" cy="7" r="5.5" fill="none" stroke="#8DCEF9" strokeWidth="2" strokeDasharray="17 17" strokeLinecap="round" />
            </svg>
            <span className="text-xs text-muted-foreground">Partial</span>
          </div>
          <div className="flex items-center gap-2">
            <svg width="14" height="14" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="7" cy="7" r="5.5" fill="none" stroke="#8DCEF9" strokeWidth="2" />
            </svg>
            <span className="text-xs text-muted-foreground">Complete</span>
          </div>
        </div>
      </div>

      {/* Bottom stat cards */}
      <div className="grid grid-cols-3 gap-4">
        {/* Vocab card */}
        <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">VOCAB</span>
            <span className="text-sm font-semibold text-foreground">
              18 <span className="font-normal text-muted-foreground text-xs">cards / day avg</span>
            </span>
          </div>
          <div className="relative flex-1 min-h-[180px]">
            <div className="absolute inset-0 px-2 pt-2">
              <ChartContainer config={VOCAB_CHART_CONFIG} className="h-full" minHeight={160}>
                <BarChart data={VOCAB_CHART_DATA} margin={{ top: 16, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
                  <XAxis
                    dataKey="day"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }}
                    domain={[0, 25]}
                    ticks={[0, 5, 10, 15, 20, 25]}
                  />
                  <ChartTooltip
                    isAnimationActive={false}
                    cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                    content={<ChartTooltipContent />}
                  />
                  <Bar dataKey="cards" fill="#8DCEF9" radius={[3, 3, 0, 0]}>
                    <LabelList
                      dataKey="cards"
                      position="top"
                      style={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }}
                    />
                  </Bar>
                </BarChart>
              </ChartContainer>
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-border px-5 py-3">
            <span className="text-xs text-muted-foreground">Accuracy: <span className="font-semibold text-[#1dae75]">92%</span></span>
            <span className="text-xs text-muted-foreground">Due for review: <span className="font-semibold text-foreground">24 words</span></span>
          </div>
        </div>

        {/* Production card */}
        <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">PRODUCTION</span>
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-sm font-semibold text-foreground">{prodAvg}%</span>
              <span className="text-[10px] text-muted-foreground">7-day avg</span>
            </div>
          </div>
          <div className="flex flex-1 flex-col gap-3 px-5 py-4">
            {PRODUCTION_SCORES.map((row) => (
              <div key={row.date} className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{row.date}</span>
                  {row.score < 70 ? (
                    <span className="rounded-sm bg-[rgba(226,75,74,0.15)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#E24B4A]">
                      Needs attention
                    </span>
                  ) : null}
                </div>
                <ScoreBar score={row.score} />
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between border-t border-border px-5 py-3">
            <span className="text-xs text-muted-foreground">Lowest: <span className="font-semibold" style={{ color: prodLow >= 70 ? '#1dae75' : '#E24B4A' }}>{prodLow}%</span></span>
            <span className="text-xs text-muted-foreground">Highest: <span className="font-semibold text-foreground">{prodHigh}%</span></span>
          </div>
        </div>

        {/* Translation card */}
        <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">TRANSLATION</span>
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-sm font-semibold text-foreground">{transAvg}%</span>
              <span className="text-[10px] text-muted-foreground">7-day avg</span>
            </div>
          </div>
          <div className="flex flex-1 flex-col gap-3 px-5 py-4">
            {TRANSLATION_SCORES.map((row) => (
              <div key={row.date} className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">{row.date}</span>
                <ScoreBar score={row.score} />
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between border-t border-border px-5 py-3">
            <span className="text-xs text-muted-foreground">Lowest: <span className="font-semibold" style={{ color: transLow >= 70 ? '#1dae75' : '#E24B4A' }}>{transLow}%</span></span>
            <span className="text-xs text-muted-foreground">Highest: <span className="font-semibold text-foreground">{transHigh}%</span></span>
          </div>
        </div>
      </div>
    </div>
  )
}
