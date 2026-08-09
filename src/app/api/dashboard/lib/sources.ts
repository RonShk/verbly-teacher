import type { Timestamp } from 'firebase-admin/firestore'
import { Timestamp as AdminTimestamp } from 'firebase-admin/firestore'

import { getAdminFirestore } from '@/lib/firebase/admin'
import { getClientLocalDayTimestampBounds, getTodayDateString } from '@/lib/server/dayBounds'

import { timed } from './_timing'

// Covers both the 60-day streak cap (stats) and the 30-day trend range.
export const ACTIVITY_LOOKBACK_DAYS = 60

const COMPLETED_ASSIGNMENTS_FETCH_LIMIT = 200

export interface RosterEntry {
  name: string
  email: string
  linkedAt: Date | null
}

export interface VocabParent {
  totalCards: number
  stateCounts: { new: number; learning: number; review: number; relearning: number }
  lastReviewAt: Date | null
}

export interface TodayAssignment {
  type: string
  completionStatus: string
  completedQuestionCount: number
  totalQuestionCount: number
  scorePercent: number | null
}

export interface CompletedAssignment {
  type: string
  completedAt: Date
  scorePercent: number | null
}

/**
 * Every Firestore read the dashboard needs, fetched once in parallel.
 * Section builders (header/practice/health/stats/trends) are pure functions
 * over this object — they must not touch Firestore themselves.
 */
export interface DashboardSources {
  studentUid: string
  utcOffsetMinutes: number
  todayStr: string
  todayStart: Date
  todayEnd: Date
  roster: RosterEntry
  vocabParent: VocabParent
  /** Card lastReview instants within the lookback window, unordered. */
  cardReviews: Date[]
  dueNowCount: number
  todayAssignments: TodayAssignment[]
  /** Newest first (query order). */
  completedAssignments: CompletedAssignment[]
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && !Number.isNaN(value) ? value : fallback
}

function scoreOrNull(value: unknown): number | null {
  return typeof value === 'number' && !Number.isNaN(value) ? Math.round(value) : null
}

/**
 * Returns null when the student is not on the tutor's roster (the roster read
 * doubles as the ownership check).
 */
export async function fetchDashboardSources(
  tutorUid: string,
  studentUid: string,
  utcOffsetMinutes: number): Promise<DashboardSources | null> {
  const db = getAdminFirestore()
  const cardsRef = db.collection('student_vocab').doc(studentUid).collection('cards')

  const todayStr = getTodayDateString(utcOffsetMinutes)
  const { start: todayStart, end: todayEnd } = getClientLocalDayTimestampBounds(todayStr, utcOffsetMinutes)
  const now = new Date()
  const lookbackStart = new Date(now.getTime() - ACTIVITY_LOOKBACK_DAYS * 24 * 60 * 60 * 1000)

  const [rosterSnap, vocabParentSnap, cardReviewsSnap, dueSnap, todayAssignmentsSnap, completedAssignmentsSnap] =
    await Promise.all([
      timed('  read rosterDoc', db.collection('teachers').doc(tutorUid).collection('students').doc(studentUid).get()),
      timed('  read vocabParent', db.collection('student_vocab').doc(studentUid).get()),
      timed('  read cardReviews', cardsRef
        .where('lastReview', '>=', AdminTimestamp.fromDate(lookbackStart))
        .select('lastReview')
        .get()),
      timed('  read dueCount', cardsRef.where('due', '<=', AdminTimestamp.fromDate(now)).count().get()),
      timed('  read todayAssignments', db
        .collection('user_assignments')
        .where('userId', '==', studentUid)
        .where('assignmentDate', '==', todayStr)
        .get()),
      timed('  read completedAssignments', db
        .collection('user_assignments')
        .where('userId', '==', studentUid)
        .where('completionStatus', '==', 'COMPLETED')
        .orderBy('completedAt', 'desc')
        .limit(COMPLETED_ASSIGNMENTS_FETCH_LIMIT)
        .get()),
    ])

  if (!rosterSnap.exists || rosterSnap.data()?.removedAt != null) return null
  const rosterData = rosterSnap.data()

  const parentData = vocabParentSnap.data()
  const stateCounts = (parentData?.stateCounts ?? {}) as Record<string, unknown>

  return {
    studentUid,
    utcOffsetMinutes,
    todayStr,
    todayStart,
    todayEnd,
    roster: {
      name: (rosterData?.name as string | undefined) ?? '',
      email: (rosterData?.email as string | undefined) ?? '',
      linkedAt: (rosterData?.signUpDate as Timestamp | undefined)?.toDate() ?? null,
    },
    vocabParent: {
      totalCards: numberOr(parentData?.totalCards, 0),
      stateCounts: {
        new: numberOr(stateCounts.new, 0),
        learning: numberOr(stateCounts.learning, 0),
        review: numberOr(stateCounts.review, 0),
        relearning: numberOr(stateCounts.relearning, 0),
      },
      lastReviewAt: (parentData?.lastReviewAt as Timestamp | undefined)?.toDate() ?? null,
    },
    cardReviews: cardReviewsSnap.docs
      .map((doc) => (doc.data().lastReview as Timestamp | undefined)?.toDate())
      .filter((d): d is Date => d != null),
    dueNowCount: dueSnap.data().count,
    todayAssignments: todayAssignmentsSnap.docs.map((doc) => {
      const d = doc.data()
      return {
        type: (d.type as string | undefined) ?? '',
        completionStatus: (d.completionStatus as string | undefined) ?? '',
        completedQuestionCount: numberOr(d.completedQuestionCount, 0),
        totalQuestionCount: numberOr(d.totalQuestionCount, 10),
        scorePercent: scoreOrNull(d.averageScorePercent),
      }
    }),
    completedAssignments: completedAssignmentsSnap.docs
      .map((doc) => {
        const d = doc.data()
        const completedAt = (d.completedAt as Timestamp | undefined)?.toDate()
        if (!completedAt) return null
        return {
          type: (d.type as string | undefined) ?? '',
          completedAt,
          scorePercent: scoreOrNull(d.averageScorePercent),
        }
      })
      .filter((a): a is CompletedAssignment => a != null),
  }
}
