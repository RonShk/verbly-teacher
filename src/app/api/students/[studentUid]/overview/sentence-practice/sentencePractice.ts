import type { QueryDocumentSnapshot } from 'firebase-admin/firestore'
import { getAdminFirestore } from '@/lib/firebase/admin'
import type { ModeTodaySummary, PracticeStatus } from '@/types/student-overview'

export type SentencePracticeType = 'PRODUCTION' | 'TRANSLATION'

type CompletionStatus = 'TODO' | 'COMPLETED'

export interface SentencePracticeAssignmentSnapshots {
  type: SentencePracticeType
  todayStr: string
  assignmentDocs: QueryDocumentSnapshot[]
}

interface AssignmentTodayMetrics {
  completedCount: number
  totalCount: number
  scorePercent: number | null
}

export async function fetchSentencePracticeAssignments(studentUid: string, todayStr: string, type: SentencePracticeType): Promise<SentencePracticeAssignmentSnapshots> {
  const db = getAdminFirestore()

  const assignmentsSnap = await db
    .collection('user_assignments')
    .where('userId', '==', studentUid)
    .where('type', '==', type)
    .where('assignmentDate', '==', todayStr)
    .get()

  return {
    type,
    todayStr,
    assignmentDocs: assignmentsSnap.docs,
  }
}

function practiceStatus(completedCount: number, totalCount: number, hasActivity: boolean): PracticeStatus {
  if (!hasActivity) return 'not_started'
  if (completedCount >= totalCount && totalCount > 0) return 'complete'
  if (completedCount > 0) return 'in_progress'
  return 'not_started'
}

function metricsFromAssignmentDoc(doc: QueryDocumentSnapshot): AssignmentTodayMetrics {
  const d = doc.data()
  const rawAverage = d.averageScorePercent as number | null | undefined
  const scorePercent = typeof rawAverage === 'number' && !Number.isNaN(rawAverage) ? Math.round(rawAverage) : null

  return {
    completedCount: (d.completedQuestionCount as number | undefined) ?? 0,
    totalCount: (d.totalQuestionCount as number | undefined) ?? 10,
    scorePercent,
  }
}

function isCompletionStatus(value: unknown): value is CompletionStatus {
  return value === 'TODO' || value === 'COMPLETED'
}

/**
 * Prefer the active TODO with the most progress; otherwise the last COMPLETED
 * row for today (continue-review can create multiple docs per day).
 */
function resolvePrimaryAssignmentToday(assignmentDocs: QueryDocumentSnapshot[]): AssignmentTodayMetrics | null {
  const todoDocs = assignmentDocs.filter((doc) => isCompletionStatus(doc.data().completionStatus) && doc.data().completionStatus === 'TODO')
  const completedDocs = assignmentDocs.filter((doc) => isCompletionStatus(doc.data().completionStatus) && doc.data().completionStatus === 'COMPLETED')

  if (todoDocs.length > 0) {
    const best = todoDocs.reduce((currentBest, doc) => {
      const bestCount = (currentBest.data().completedQuestionCount as number | undefined) ?? 0
      const docCount = (doc.data().completedQuestionCount as number | undefined) ?? 0
      return docCount > bestCount ? doc : currentBest
    })
    return metricsFromAssignmentDoc(best)
  }

  if (completedDocs.length > 0) {
    const doc = completedDocs[completedDocs.length - 1]
    const metrics = metricsFromAssignmentDoc(doc)
    return {
      completedCount: metrics.totalCount,
      totalCount: metrics.totalCount,
      scorePercent: metrics.scorePercent,
    }
  }

  return null
}

export async function buildModeTodaySummary(assignments: SentencePracticeAssignmentSnapshots): Promise<ModeTodaySummary> {
  const { assignmentDocs } = assignments
  const primary = resolvePrimaryAssignmentToday(assignmentDocs)
  const hasActivity = assignmentDocs.length > 0
  const completedCount = primary?.completedCount ?? 0
  const totalCount = primary?.totalCount ?? 10
  const scorePercent = primary?.scorePercent ?? null

  return {
    status: practiceStatus(completedCount, totalCount, hasActivity),
    completedCount,
    totalCount,
    scorePercent,
  }
}
