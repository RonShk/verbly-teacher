import type { QueryDocumentSnapshot, Timestamp } from 'firebase-admin/firestore'

import { getAdminFirestore } from '@/lib/firebase/admin'
import { isInstantOnDate } from '@/lib/server/dayBounds'
import type { PracticeStatus,VocabHealthSummary,VocabTodaySummary } from '@/types/student-overview'


const FSRS_NEW = 0
const FSRS_LEARNING = 1
const FSRS_REVIEW = 2
const FSRS_RELEARNING = 3

export interface VocabOverviewResult {
  health: VocabHealthSummary
  today: VocabTodaySummary
  lastReviewAt: Date | null
}

function vocabStatus(reviewedCount: number): PracticeStatus {
  if (reviewedCount === 0) return 'not_started'
  return 'complete'
}

function buildFromVocabDocs(vocabDocs: QueryDocumentSnapshot[], todayStr: string, utcOffsetMinutes: number): VocabOverviewResult {
  const health = { new: 0, learning: 0, review: 0, relearning: 0, total: 0 }

  //determining the state of each word (new,learning,reviewing,relearning)
  for (const doc of vocabDocs) {
    const state = typeof doc.data().state === 'number' ? doc.data().state : -1
    if (state === FSRS_NEW) health.new += 1
    else if (state === FSRS_LEARNING) health.learning += 1
    else if (state === FSRS_REVIEW) health.review += 1
    else if (state === FSRS_RELEARNING) health.relearning += 1
    health.total += 1
  }

  let reviewedCount = 0
  let lastReviewAt: Date | null = null

  for (const doc of vocabDocs) {
    const lastReview = doc.data().lastReview as Timestamp | undefined
    if (!lastReview) continue

    const reviewed = lastReview.toDate()
    if (!lastReviewAt || reviewed > lastReviewAt) lastReviewAt = reviewed
    if (isInstantOnDate(reviewed, todayStr, utcOffsetMinutes)) {
      reviewedCount += 1
    }
  }

  return {
    health,
    today: {
      status: vocabStatus(reviewedCount),
      reviewedCount,
    },
    lastReviewAt,
  }
}

export async function fetchVocabOverview(studentUid: string, todayStr: string, utcOffsetMinutes: number,): Promise<VocabOverviewResult> {
  const db = getAdminFirestore()

  const vocabSnap = await db
    .collection('student_vocab')
    .where('studentUid', '==', studentUid)
    .limit(1)
    .get()

  if (vocabSnap.empty) {
    return { health: { new: 0, learning: 0, review: 0, relearning: 0, total: 0 }, today: { status: 'not_started', reviewedCount: 0 }, lastReviewAt: null }
  }

  const cardsSnap = await vocabSnap.docs[0].ref.collection('cards').get()

  return buildFromVocabDocs(cardsSnap.docs, todayStr, utcOffsetMinutes)
}
