'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList } from 'recharts'
import type { StudentProgressResponse, ActivityStatus } from '@/types/student-progress'
import { clientAuth } from '@/lib/firebase/client'

// ---------------------------------------------------------------------------
// Color palette
// ---------------------------------------------------------------------------

const ACCENT = '#8DCEF9'
const RED = '#F87171'    // <70
const GREEN = '#34D399'  // >=90
const NORMAL = '#f0f0f0' // 70–89

function accuracyColor(score: number): string {
  if (score < 70) return RED
  if (score >= 90) return GREEN
  return NORMAL
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

function addDays(dateStr: string, n: number): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day + n)).toISOString().slice(0, 10)
}

function formatDateHeader(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const names = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
  return `${names[new Date(Date.UTC(year, month - 1, day)).getUTCDay()]} ${day}`
}

function formatDateLabel(dateStr: string): string {
  const [, month, day] = dateStr.split('-').map(Number)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[month - 1]} ${day}`
}

function formatWeekRange(weekStart: string, weekEnd: string): string {
  const [year] = weekEnd.split('-')
  return `${formatDateLabel(weekStart)} – ${formatDateLabel(weekEnd)}, ${year}`
}

function formatDayShort(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return names[new Date(Date.UTC(year, month - 1, day)).getUTCDay()]
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const VOCAB_CHART_CONFIG = {
  cards: { label: 'Cards reviewed', color: ACCENT },
} satisfies ChartConfig

function CalendarDot({ status, accuracy }: { status: ActivityStatus; accuracy?: number | null }) {
  const SIZE = 22
  const STROKE = 2.5
  const r = (SIZE - STROKE) / 2
  const circ = 2 * Math.PI * r
  const cx = SIZE / 2
  const cy = SIZE / 2

  const targetPct =
    status === 'not_attempted' ? 0 :
    status === 'complete' ? 1 :
    accuracy != null ? accuracy / 100 : 0.5

  const [animatedPct, setAnimatedPct] = useState(0)
  useEffect(() => {
    if (status === 'not_attempted') return
    const id = setTimeout(() => setAnimatedPct(targetPct), 30)
    return () => clearTimeout(id)
  }, [status, targetPct])

  if (status === 'not_attempted') {
    return (
      <svg width={SIZE} height={SIZE}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={STROKE} />
      </svg>
    )
  }

  const dash = animatedPct * circ
  const label = accuracy != null ? `${accuracy}% Accuracy` : status === 'complete' ? 'Complete' : 'Partial'

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <svg width={SIZE} height={SIZE} style={{ transform: 'rotate(-90deg)', cursor: 'default' }}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(141,206,249,0.15)" strokeWidth={STROKE} />
          <circle
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={ACCENT}
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

  return (
    <div className="flex items-center gap-3">
      <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-out"
          style={{ width: `${width}%`, backgroundColor: score < 70 ? RED : ACCENT }}
        />
      </div>
      <span className="w-9 shrink-0 text-right text-sm font-medium" style={{ color: accuracyColor(score) }}>
        {score}%
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ProgressPage() {
  const { studentUid } = useParams<{ studentUid: string }>()
  const [weekStart, setWeekStart] = useState<string | null>(null)
  const [data, setData] = useState<StudentProgressResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    setLoading(true)
    setError(false)
    const tzOffset = -new Date().getTimezoneOffset()
    const params = new URLSearchParams({ timezoneOffsetMinutes: String(tzOffset) })
    if (weekStart) params.set('weekStart', weekStart)

    const user = clientAuth.currentUser
    if (!user) { setError(true); setLoading(false); return }

    user.getIdToken()
      .then((token) => fetch(`/api/students/${studentUid}/progress?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      }))
      .then(async (res) => {
        if (!res.ok) throw new Error()
        return res.json() as Promise<StudentProgressResponse>
      })
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [studentUid, weekStart])

  if (loading && !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <span className="text-sm text-muted-foreground">Failed to load progress data.</span>
      </div>
    )
  }

  const { production, translation, vocabCounts } = data

  // Vocab bar chart
  const vocabChartData = data.vocab.dailyCardCounts.map((d) => ({
    day: formatDayShort(d.date),
    cards: d.cardsReviewed,
  }))
  const maxCards = Math.max(...data.vocab.dailyCardCounts.map((d) => d.cardsReviewed), 10)
  const yMax = Math.ceil(maxCards / 5) * 5

  return (
    <div className={`flex flex-col gap-5 p-8 transition-opacity duration-150 ${loading ? 'opacity-50' : 'opacity-100'}`}>
      {/* Practice activity card */}
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="flex items-start justify-between border-b border-border px-6 py-5">
          <div>
            <h2 className="text-xl font-bold font-heading text-foreground">Practice Activity</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">{formatWeekRange(data.weekStart, data.weekEnd)}</p>
          </div>
        </div>

        {/* Week navigation */}
        <div className="flex items-center justify-between px-6 py-2.5">
          <button
            className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
            onClick={() => setWeekStart(addDays(data.weekStart, -7))}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Previous week
          </button>
          <button
            className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
            onClick={() => setWeekStart(addDays(data.weekStart, 7))}
          >
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
                {data.days.map((d) => (
                  <th
                    key={d.date}
                    className="pb-4 text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
                  >
                    {formatDateHeader(d.date)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">VOCAB</td>
                {data.days.map((d) => (
                  <td key={d.date} className="py-4 text-center">
                    <div className="flex justify-center">
                      <CalendarDot status={d.vocab} />
                    </div>
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">PRODUCTION</td>
                {data.days.map((d) => (
                  <td key={d.date} className="py-4 text-center">
                    <div className="flex justify-center">
                      <CalendarDot status={d.production} accuracy={d.productionAccuracy} />
                    </div>
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">TRANSLATION</td>
                {data.days.map((d) => (
                  <td key={d.date} className="py-4 text-center">
                    <div className="flex justify-center">
                      <CalendarDot status={d.translation} accuracy={d.translationAccuracy} />
                    </div>
                  </td>
                ))}
              </tr>
              <tr className="border-t border-border">
                <td className="py-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">DAILY AVG</td>
                {data.days.map((d) => (
                  <td key={d.date} className="py-4 text-center">
                    {d.dailyAvg !== null ? (
                      <span className="text-xs font-semibold" style={{ color: accuracyColor(d.dailyAvg) }}>
                        {d.dailyAvg}%
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground/60">N/A</span>
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
              {data.vocab.cardsPerDayAvg} <span className="font-normal text-muted-foreground text-xs">cards / day avg</span>
            </span>
          </div>
          <div className="relative flex-1 min-h-[180px]">
            <div className="absolute inset-0 px-2 pt-2">
              <ChartContainer config={VOCAB_CHART_CONFIG} className="h-full" minHeight={160}>
                <BarChart data={vocabChartData} margin={{ top: 16, right: 8, left: -16, bottom: 0 }}>
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
                    domain={[0, yMax]}
                    ticks={Array.from({ length: yMax / 5 + 1 }, (_, i) => i * 5)}
                  />
                  <ChartTooltip
                    isAnimationActive={false}
                    cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                    content={<ChartTooltipContent />}
                  />
                  <Bar dataKey="cards" fill={ACCENT} radius={[3, 3, 0, 0]}>
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
            <span className="text-xs text-muted-foreground">
              Accuracy:{' '}
              <span
                className="font-semibold"
                style={{ color: data.vocab.weeklyAccuracyAvg > 0 ? accuracyColor(data.vocab.weeklyAccuracyAvg) : NORMAL }}
              >
                {data.vocab.weeklyAccuracyAvg > 0 ? `${data.vocab.weeklyAccuracyAvg}%` : '—'}
              </span>
            </span>
            <span className="text-xs text-muted-foreground">
              Due for review: <span className="font-semibold text-foreground">{vocabCounts.dueForReview} words</span>
            </span>
          </div>
        </div>

        {/* Production card */}
        <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">PRODUCTION</span>
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-sm font-semibold text-foreground">
                {production.sessions.length > 0 ? `${production.sevenDayAvg}%` : '—'}
              </span>
              <span className="text-[10px] text-muted-foreground">7-day avg</span>
            </div>
          </div>
          <div className="flex flex-1 flex-col gap-3 px-5 py-4">
            {production.sessions.length === 0 ? (
              <span className="text-xs text-muted-foreground">No sessions in the last 7 days.</span>
            ) : (
              production.sessions.map((row) => (
                <div key={row.date} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{formatDateLabel(row.date)}</span>
                    {row.needsAttention && (
                      <span className="rounded-sm bg-[rgba(248,113,113,0.15)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#F87171]">
                        Needs attention
                      </span>
                    )}
                  </div>
                  <ScoreBar score={row.accuracy} />
                </div>
              ))
            )}
          </div>
          <div className="flex items-center justify-between border-t border-border px-5 py-3">
            <span className="text-xs text-muted-foreground">
              Lowest:{' '}
              <span className="font-semibold" style={{ color: production.sessions.length > 0 ? accuracyColor(production.lowest) : NORMAL }}>
                {production.sessions.length > 0 ? `${production.lowest}%` : '—'}
              </span>
            </span>
            <span className="text-xs text-muted-foreground">
              Highest:{' '}
              <span className="font-semibold" style={{ color: production.sessions.length > 0 ? accuracyColor(production.highest) : NORMAL }}>
                {production.sessions.length > 0 ? `${production.highest}%` : '—'}
              </span>
            </span>
          </div>
        </div>

        {/* Translation card */}
        <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">TRANSLATION</span>
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-sm font-semibold text-foreground">
                {translation.sessions.length > 0 ? `${translation.sevenDayAvg}%` : '—'}
              </span>
              <span className="text-[10px] text-muted-foreground">7-day avg</span>
            </div>
          </div>
          <div className="flex flex-1 flex-col gap-3 px-5 py-4">
            {translation.sessions.length === 0 ? (
              <span className="text-xs text-muted-foreground">No sessions in the last 7 days.</span>
            ) : (
              translation.sessions.map((row) => (
                <div key={row.date} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{formatDateLabel(row.date)}</span>
                    {row.needsAttention && (
                      <span className="rounded-sm bg-[rgba(248,113,113,0.15)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#F87171]">
                        Needs attention
                      </span>
                    )}
                  </div>
                  <ScoreBar score={row.accuracy} />
                </div>
              ))
            )}
          </div>
          <div className="flex items-center justify-between border-t border-border px-5 py-3">
            <span className="text-xs text-muted-foreground">
              Lowest:{' '}
              <span className="font-semibold" style={{ color: translation.sessions.length > 0 ? accuracyColor(translation.lowest) : NORMAL }}>
                {translation.sessions.length > 0 ? `${translation.lowest}%` : '—'}
              </span>
            </span>
            <span className="text-xs text-muted-foreground">
              Highest:{' '}
              <span className="font-semibold" style={{ color: translation.sessions.length > 0 ? accuracyColor(translation.highest) : NORMAL }}>
                {translation.sessions.length > 0 ? `${translation.highest}%` : '—'}
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
