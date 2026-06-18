import type { DocumentData, Timestamp } from 'firebase-admin/firestore'
import { Timestamp as AdminTimestamp } from 'firebase-admin/firestore'

import { getAdminFirestore } from '@/lib/firebase/admin'
import { getClientLocalDayTimestampBounds } from '@/lib/server/dayBounds'
import type { PracticeStatus, VocabHealthSummary, VocabTodaySummary } from '@/types/student-overview'

export const FSRS_NEW = 0
export const FSRS_LEARNING = 1
export const FSRS_REVIEW = 2
export const FSRS_RELEARNING = 3

export interface VocabOverviewResult {
  health: VocabHealthSummary
  today: VocabTodaySummary
  lastReviewAt: Date | null
}

function vocabStatus(reviewedCount: number): PracticeStatus {
  if (reviewedCount === 0) return 'not_started'
  return 'complete'
}

function healthFromParent(data: DocumentData | undefined): VocabHealthSummary {
  const stateCounts = (data?.stateCounts ?? {}) as Record<string, unknown>
  return {
    new: typeof stateCounts.new === 'number' ? stateCounts.new : 0,
    learning: typeof stateCounts.learning === 'number' ? stateCounts.learning : 0,
    review: typeof stateCounts.review === 'number' ? stateCounts.review : 0,
    relearning: typeof stateCounts.relearning === 'number' ? stateCounts.relearning : 0,
    total: typeof data?.totalCards === 'number' ? data.totalCards : 0,
  }
}

export async function fetchVocabOverview(
  studentUid: string,
  todayStr: string,
  utcOffsetMinutes: number,
): Promise<VocabOverviewResult> {
  const db = getAdminFirestore()
  const cardsRef = db.collection('student_vocab').doc(studentUid).collection('cards')

  const { start, end } = getClientLocalDayTimestampBounds(todayStr, utcOffsetMinutes)

  const [parentSnap, reviewedTodaySnap] = await Promise.all([
    db.collection('student_vocab').doc(studentUid).get(),
    cardsRef
      .where('lastReview', '>=', AdminTimestamp.fromDate(start))
      .where('lastReview', '<', AdminTimestamp.fromDate(end))
      .count()
      .get(),
  ])

  const parentData = parentSnap.data()
  const health = healthFromParent(parentData)
  const lastReview = parentData?.lastReviewAt as Timestamp | undefined
  const reviewedCount = reviewedTodaySnap.data().count

  return {
    health,
    today: {
      status: vocabStatus(reviewedCount),
      reviewedCount,
    },
    lastReviewAt: lastReview?.toDate() ?? null,
  }
}
