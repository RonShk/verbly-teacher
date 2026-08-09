import { localDayString, shiftDayString } from '@/lib/server/dayBounds'
import type { DashboardStats } from '@/types/dashboard'
import { ACTIVITY_LOOKBACK_DAYS, type DashboardSources } from './sources'

/**
 * Consecutive active days ending today (or yesterday, so an unbroken streak
 * isn't shown as 0 before the student practices today).
 */
function computeStreak(activeDays: Set<string>, todayStr: string): number {
  let cursor = activeDays.has(todayStr) ? todayStr : shiftDayString(todayStr, -1)
  let streak = 0
  while (activeDays.has(cursor) && streak < ACTIVITY_LOOKBACK_DAYS) {
    streak++
    cursor = shiftDayString(cursor, -1)
  }
  return streak
}

/** Span between first and last activity today, ≥1 minute when anything happened. */
function computeTimeSpentMinutes(todayInstants: Date[]): number {
  if (todayInstants.length === 0) return 0
  const times = todayInstants.map((d) => d.getTime())
  const spanMinutes = Math.round((Math.max(...times) - Math.min(...times)) / 60_000)
  return Math.max(spanMinutes, 1)
}

/** Builds the four stat tiles from card reviews and completed assignments. */
export function buildStats(sources: DashboardSources): DashboardStats {
  const { utcOffsetMinutes, todayStr, todayStart, todayEnd } = sources

  const activeDays = new Set<string>()
  const todayInstants: Date[] = []
  let wordsReviewedToday = 0

  for (const instant of sources.cardReviews) {
    activeDays.add(localDayString(instant, utcOffsetMinutes))
    if (instant >= todayStart && instant < todayEnd) {
      wordsReviewedToday++
      todayInstants.push(instant)
    }
  }

  for (const assignment of sources.completedAssignments) {
    activeDays.add(localDayString(assignment.completedAt, utcOffsetMinutes))
    if (assignment.completedAt >= todayStart && assignment.completedAt < todayEnd) {
      todayInstants.push(assignment.completedAt)
    }
  }

  return {
    timeSpentTodayMinutes: computeTimeSpentMinutes(todayInstants),
    wordsReviewedToday,
    currentStreakDays: computeStreak(activeDays, todayStr),
    wordsDueNow: sources.dueNowCount,
  }
}
