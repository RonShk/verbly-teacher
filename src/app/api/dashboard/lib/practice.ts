import type { ModePracticeToday, PracticeStatus, TodaysPractice } from '@/types/dashboard'
import type { DashboardSources, TodayAssignment } from './sources'

function modeStatus(completedCount: number, totalCount: number, hasActivity: boolean): PracticeStatus {
  if (!hasActivity) return 'not_started'
  if (completedCount >= totalCount && totalCount > 0) return 'complete'
  if (completedCount > 0) return 'in_progress'
  return 'not_started'
}

/**
 * Prefer the active TODO with the most progress; otherwise the last COMPLETED
 * row for today (continue-review can create multiple docs per day).
 */
function primaryAssignment(assignments: TodayAssignment[]): TodayAssignment | null {
  const todos = assignments.filter((a) => a.completionStatus === 'TODO')
  if (todos.length > 0) {
    return todos.reduce((best, a) => (a.completedQuestionCount > best.completedQuestionCount ? a : best))
  }
  const completed = assignments.filter((a) => a.completionStatus === 'COMPLETED')
  if (completed.length > 0) {
    const last = completed[completed.length - 1]
    return { ...last, completedQuestionCount: last.totalQuestionCount }
  }
  return null
}

function buildMode(sources: DashboardSources, type: 'PRODUCTION' | 'TRANSLATION'): ModePracticeToday {
  const assignments = sources.todayAssignments.filter((a) => a.type === type)
  const primary = primaryAssignment(assignments)
  const completedCount = primary?.completedQuestionCount ?? 0
  const totalCount = primary?.totalQuestionCount ?? 10

  return {
    status: modeStatus(completedCount, totalCount, assignments.length > 0),
    completedCount,
    totalCount,
    scorePercent: primary?.scorePercent ?? null,
  }
}

/** Builds the Today's Practice card: vocab reviews plus both sentence modes. */
export function buildTodaysPractice(sources: DashboardSources): TodaysPractice {
  const reviewedCount = sources.cardReviews.filter(
    (d) => d >= sources.todayStart && d < sources.todayEnd,
  ).length

  return {
    vocab: {
      status: reviewedCount === 0 ? 'not_started' : 'complete',
      reviewedCount,
      dueCount: sources.dueNowCount,
    },
    production: buildMode(sources, 'PRODUCTION'),
    translation: buildMode(sources, 'TRANSLATION'),
  }
}
