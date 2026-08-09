import { localDayString, shiftDayString } from '@/lib/server/dayBounds'
import type { AccuracyTrendPoint, DashboardTrends, TrendSeries, TrendsRange, VocabTrendPoint } from '@/types/dashboard'
import type { DashboardSources } from './sources'

const RANGE_DAYS: Record<TrendsRange, number> = {
  this_week: 7,
  last_week: 7,
  last_month: 30,
}

function dayLabel(dayStr: string, range: TrendsRange): string {
  const [year, month, day] = dayStr.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  if (range === 'last_month') {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
  }
  return date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })
}

/** Ordered local day strings covered by the range, oldest first. */
function rangeDays(range: TrendsRange, todayStr: string): string[] {
  const lastDay = range === 'last_week' ? shiftDayString(todayStr, -7) : todayStr
  const days: string[] = []
  for (let i = RANGE_DAYS[range] - 1; i >= 0; i--) days.push(shiftDayString(lastDay, -i))
  return days
}

function buildSeries(sources: DashboardSources, range: TrendsRange): TrendSeries {
  const { utcOffsetMinutes, todayStr } = sources
  const days = rangeDays(range, todayStr)
  const daySet = new Set(days)

  const cardCounts = new Map<string, number>(days.map((d) => [d, 0]))
  for (const instant of sources.cardReviews) {
    const day = localDayString(instant, utcOffsetMinutes)
    if (daySet.has(day)) cardCounts.set(day, (cardCounts.get(day) ?? 0) + 1)
  }

  const vocabPerDay: VocabTrendPoint[] = days.map((date) => ({
    date,
    label: dayLabel(date, range),
    cards: cardCounts.get(date) ?? 0,
  }))

  const production: AccuracyTrendPoint[] = []
  const translation: AccuracyTrendPoint[] = []
  for (const a of sources.completedAssignments) {
    if (a.scorePercent == null) continue
    const day = localDayString(a.completedAt, utcOffsetMinutes)
    if (!daySet.has(day)) continue
    const point = { date: day, label: dayLabel(day, range), score: a.scorePercent }
    if (a.type === 'PRODUCTION') production.push(point)
    else if (a.type === 'TRANSLATION') translation.push(point)
  }
  // Assignments arrive newest first; charts want oldest first.
  production.reverse()
  translation.reverse()

  return { vocabPerDay, production, translation }
}

/** Builds the Weekly Trends card — all three ranges from the same fetched data. */
export function buildTrends(sources: DashboardSources): DashboardTrends {
  return {
    this_week: buildSeries(sources, 'this_week'),
    last_week: buildSeries(sources, 'last_week'),
    last_month: buildSeries(sources, 'last_month'),
  }
}
