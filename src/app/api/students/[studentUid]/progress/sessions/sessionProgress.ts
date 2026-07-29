import { getAdminFirestore } from '@/lib/firebase/admin'
import type { ActivityStatus, SessionAccuracyEntry, SessionActivityStats } from '@/types/student-progress'

export const NEEDS_ATTENTION_THRESHOLD = 70

type AssignmentType = 'PRODUCTION' | 'TRANSLATION'

interface AssignmentData {
  assignmentDate: string
  completionStatus: string
  completedQuestionCount: number
  totalQuestionCount: number
  averageScorePercent: number | null | undefined
  scoreSum: number
  scoredQuestionCount: number
}

function getAccuracy(doc: AssignmentData): number | null {
  if (typeof doc.averageScorePercent === 'number' && !Number.isNaN(doc.averageScorePercent)) {
    return doc.averageScorePercent
  }
  if (typeof doc.scoredQuestionCount === 'number' && doc.scoredQuestionCount > 0) {
    return (doc.scoreSum / doc.scoredQuestionCount) * 100
  }
  return null
}

function assignmentActivityStatus(doc: AssignmentData): ActivityStatus {
  const completed = (doc.completedQuestionCount as number | undefined) ?? 0
  const total = (doc.totalQuestionCount as number | undefined) ?? 0
  if (completed === 0) return 'not_attempted'
  if (doc.completionStatus === 'COMPLETED' && completed >= total) return 'complete'
  return 'partial'
}

// Prefer the most-progressed TODO doc; fall back to last COMPLETED doc.
function resolvePrimary(docs: AssignmentData[]): AssignmentData | null {
  const todos = docs.filter((d) => d.completionStatus === 'TODO')
  if (todos.length > 0) {
    return todos.reduce((best, d) =>
      (d.completedQuestionCount ?? 0) > (best.completedQuestionCount ?? 0) ? d : best,
    )
  }
  const completed = docs.filter((d) => d.completionStatus === 'COMPLETED')
  return completed.length > 0 ? completed[completed.length - 1] : null
}

function buildStats(sessions: SessionAccuracyEntry[]): SessionActivityStats {
  if (sessions.length === 0) {
    return { sevenDayAvg: 0, lowest: 0, highest: 0, sessions: [] }
  }
  const accuracies = sessions.map((s) => s.accuracy)
  return {
    sevenDayAvg: Math.round(accuracies.reduce((sum, a) => sum + a, 0) / accuracies.length),
    lowest: Math.min(...accuracies),
    highest: Math.max(...accuracies),
    sessions,
  }
}

export interface SessionProgressResult {
  stats: SessionActivityStats
  dailyStatus: Map<string, ActivityStatus>
  dailyAccuracy: Map<string, number | null>
}

export async function fetchSessionProgress(
  studentUid: string,
  type: AssignmentType,
  weekDays: string[],
  rollingDays: string[],
): Promise<SessionProgressResult> {
  const db = getAdminFirestore()

  // One query covering the union of both windows
  const allDates = [...new Set([...weekDays, ...rollingDays])].sort()
  const startDate = allDates[0]
  const endDate = allDates[allDates.length - 1]

  const snap = await db
    .collection('user_assignments')
    .where('userId', '==', studentUid)
    .where('type', '==', type)
    .where('assignmentDate', '>=', startDate)
    .where('assignmentDate', '<=', endDate)
    .get()

  const byDate = new Map<string, AssignmentData[]>()
  for (const doc of snap.docs) {
    const d = doc.data() as AssignmentData
    const existing = byDate.get(d.assignmentDate) ?? []
    existing.push(d)
    byDate.set(d.assignmentDate, existing)
  }

  // Per-day status and accuracy for the Practice Activity grid
  const dailyStatus = new Map<string, ActivityStatus>()
  const dailyAccuracy = new Map<string, number | null>()
  for (const date of weekDays) {
    const docs = byDate.get(date) ?? []
    const primary = resolvePrimary(docs)
    dailyStatus.set(date, primary ? assignmentActivityStatus(primary) : 'not_attempted')
    dailyAccuracy.set(date, primary ? getAccuracy(primary) : null)
  }

  // Rolling 7-day session entries for stats
  const rollingSessions: SessionAccuracyEntry[] = []
  for (const date of rollingDays) {
    const docs = byDate.get(date) ?? []
    const primary = resolvePrimary(docs)
    if (!primary) continue
    const accuracy = getAccuracy(primary)
    if (accuracy === null) continue
    rollingSessions.push({
      date,
      accuracy: Math.round(accuracy),
      needsAttention: accuracy < NEEDS_ATTENTION_THRESHOLD,
    })
  }

  // Sorted descending by date as specified
  rollingSessions.sort((a, b) => b.date.localeCompare(a.date))

  return { stats: buildStats(rollingSessions), dailyStatus, dailyAccuracy }
}
