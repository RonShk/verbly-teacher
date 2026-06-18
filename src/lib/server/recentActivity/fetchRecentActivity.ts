import type { QueryDocumentSnapshot, Timestamp } from 'firebase-admin/firestore'
import { Timestamp as AdminTimestamp } from 'firebase-admin/firestore'
import { getAdminFirestore } from '@/lib/firebase/admin'
import { getClientLocalDayTimestampBounds } from '@/lib/server/dayBounds'
import type { FetchRecentActivityParams, RecentActivityItem, RecentActivityType } from '@/types/recent-activity'

const DEFAULT_LIMIT = 10
const PER_STUDENT_FETCH_LIMIT = 5

const ASSIGNMENT_TYPE_MAP: Record<string, RecentActivityType | undefined> = {
  PRODUCTION: 'production',
  TRANSLATION: 'translation',
  VOCAB: 'vocab',
}

const ACTIVITY_TITLES: Record<RecentActivityType, string> = {
  vocab: 'Vocabulary Practice',
  production: 'Production Practice',
  translation: 'Translation Practice',
  words_added: 'Words Added',
}

function titleForType(type: RecentActivityType): string {
  return ACTIVITY_TITLES[type]
}

function localDayString(instant: Date, utcOffsetMinutes: number): string {
  const offsetMs = utcOffsetMinutes * 60_000
  return new Date(instant.getTime() + offsetMs).toISOString().slice(0, 10)
}

function detailForAssignment(type: RecentActivityType, scorePercent: number | null, cardsReviewed: number | null): string {
  if (type === 'vocab') {
    return cardsReviewed != null ? `${cardsReviewed} cards reviewed` : 'Cards reviewed'
  }
  if (scorePercent != null) return `${scorePercent}% Accuracy`
  return 'Completed'
}

function assignmentDocToActivity(doc: QueryDocumentSnapshot, studentUid: string, studentName: string ): RecentActivityItem | null {
  const data = doc.data()
  const completedAt = data.completedAt as Timestamp | undefined
  if (!completedAt) return null

  const rawType = data.type as string | undefined
  const type = rawType ? ASSIGNMENT_TYPE_MAP[rawType] : undefined
  if (!type || type === 'words_added') return null

  const rawScore = data.averageScorePercent as number | null | undefined
  const scorePercent =
    typeof rawScore === 'number' && !Number.isNaN(rawScore) ? Math.round(rawScore) : null
  const cardsReviewed =
    type === 'vocab' ? ((data.completedQuestionCount as number | undefined) ?? null) : null

  return {
    id: doc.id,
    studentUid,
    studentName,
    type,
    title: titleForType(type),
    detail: detailForAssignment(type, scorePercent, cardsReviewed),
    occurredAt: completedAt.toDate().toISOString(),
    scorePercent: type === 'vocab' ? null : scorePercent,
    cardsReviewed,
  }
}

async function fetchRoster(tutorUid: string, studentUid?: string): Promise<Map<string, string>> {
  const db = getAdminFirestore()
  const rosterRef = db.collection('teachers').doc(tutorUid).collection('students')

  if (studentUid) {
    const doc = await rosterRef.doc(studentUid).get()
    if (!doc.exists || doc.data()?.removedAt != null) return new Map()
    return new Map([[studentUid, (doc.data()?.name as string | undefined) ?? '']])
  }

  const snap = await rosterRef.get()
  const roster = new Map<string, string>()
  for (const doc of snap.docs) {
    if (doc.data()?.removedAt != null) continue
    roster.set(doc.id, (doc.data()?.name as string | undefined) ?? '')
  }
  return roster
}

async function fetchCompletedAssignments(studentUid: string, limit: number): Promise<RecentActivityItem[]> {
  const snap = await getAdminFirestore()
    .collection('user_assignments')
    .where('userId', '==', studentUid)
    .where('completionStatus', '==', 'COMPLETED')
    .orderBy('completedAt', 'desc')
    .limit(limit)
    .get()

  return snap.docs
    .map((doc) => assignmentDocToActivity(doc, studentUid, ''))
    .filter((item): item is RecentActivityItem => item != null)
}

async function fetchLatestVocabActivity(studentUid: string, studentName: string, utcOffsetMinutes: number): Promise<RecentActivityItem | null> {
  const db = getAdminFirestore()
  const parentSnap = await db.collection('student_vocab').doc(studentUid).get()
  if (!parentSnap.exists) return null

  const lastActiveAt = parentSnap.data()?.lastActiveAt as Timestamp | undefined
  if (!lastActiveAt) return null

  const lastActiveAtDate = lastActiveAt.toDate()
  const dayStr = localDayString(lastActiveAtDate, utcOffsetMinutes)
  const { start, end } = getClientLocalDayTimestampBounds(dayStr, utcOffsetMinutes)

  const cardsReviewedTodayCount = (
    await db
      .collection('student_vocab')
      .doc(studentUid)
      .collection('cards')
      .where('lastReview', '>=', AdminTimestamp.fromDate(start))
      .where('lastReview', '<', AdminTimestamp.fromDate(end))
      .count()
      .get()
  ).data().count

  if (cardsReviewedTodayCount === 0) return null

  const occurredAt = lastActiveAtDate.toISOString()

  return {
    // No Firestore doc for this row — use occurredAt as a stable list key (same as occurredAt field).
    id: occurredAt,
    studentUid,
    studentName,
    type: 'vocab',
    title: titleForType('vocab'),
    detail: detailForAssignment('vocab', null, cardsReviewedTodayCount),
    occurredAt,
    scorePercent: null,
    cardsReviewed: cardsReviewedTodayCount,
  }
}

function mergeAndSort(items: RecentActivityItem[], limit: number): RecentActivityItem[] {
  const byKey = new Map<string, RecentActivityItem>()
  for (const item of items) {
    const existing = byKey.get(item.id)
    if (!existing || item.occurredAt > existing.occurredAt) {
      byKey.set(item.id, item)
    }
  }

  return [...byKey.values()]
    .sort((a, b) => (a.occurredAt > b.occurredAt ? -1 : a.occurredAt < b.occurredAt ? 1 : 0))
    .slice(0, limit)
}

/**
 * Loads recent student activity for the tutor dashboard.
 * Use on the homepage (all roster students) or student overview (single student).
 */
export async function fetchRecentActivity(params: FetchRecentActivityParams): Promise<RecentActivityItem[]> {
  const limit = params.limit ?? DEFAULT_LIMIT
  const utcOffsetMinutes = params.timezoneOffsetMinutes ?? 0
  const roster = await fetchRoster(params.tutorUid, params.studentUid)
  if (roster.size === 0) return []

  const perStudentLimit = Math.min(PER_STUDENT_FETCH_LIMIT, limit)

  const activitySets = await Promise.all(
    [...roster.entries()].map(async ([studentUid, studentName]) => {
      const [assignments, vocabActivity] = await Promise.all([
        fetchCompletedAssignments(studentUid, perStudentLimit),
        fetchLatestVocabActivity(studentUid, studentName, utcOffsetMinutes),
      ])

      return [
        ...assignments.map((item) => ({ ...item, studentName })),
        ...(vocabActivity ? [vocabActivity] : []),
      ]
    }),
  )

  return mergeAndSort(activitySets.flat(), limit)
}
