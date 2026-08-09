import type { DashboardStudent } from '@/types/dashboard'
import type { DashboardSources } from './sources'

/** Builds the header card: identity, linked date, last activity, vocab size. */
export function buildHeader(sources: DashboardSources): DashboardStudent {
  const latestCompletedAt = sources.completedAssignments[0]?.completedAt ?? null
  const lastReviewAt = sources.vocabParent.lastReviewAt

  let lastActiveAt = lastReviewAt
  if (latestCompletedAt && (!lastActiveAt || latestCompletedAt > lastActiveAt)) {
    lastActiveAt = latestCompletedAt
  }

  return {
    uid: sources.studentUid,
    name: sources.roster.name,
    email: sources.roster.email,
    linkedAt: sources.roster.linkedAt?.toISOString() ?? null,
    lastActiveAt: lastActiveAt?.toISOString() ?? null,
    vocabTotal: sources.vocabParent.totalCards,
  }
}
