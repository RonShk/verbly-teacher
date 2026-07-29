import { Timestamp as AdminTimestamp } from 'firebase-admin/firestore'
import { getAdminFirestore } from '@/lib/firebase/admin'
import { getClientLocalDayTimestampBounds } from '@/lib/server/dayBounds'
import type { ActivityStatus, VocabActivityStats, VocabCounts, VocabDayStats } from '@/types/student-progress'

function toLocalDateStr(date: Date, utcOffsetMinutes: number): string {
  const local = new Date(date.getTime() + utcOffsetMinutes * 60_000)
  return local.toISOString().slice(0, 10)
}

export interface VocabProgressResult {
  vocabCounts: VocabCounts
  vocabActivity: VocabActivityStats
  dailyVocabStatus: Map<string, { cardsReviewed: number; cardsDue: number }>
}

export async function fetchVocabProgress(
  studentUid: string,
  weekDays: string[],
  rollingDays: string[],
  utcOffsetMinutes: number,
): Promise<VocabProgressResult> {
  const db = getAdminFirestore()
  const parentRef = db.collection('student_vocab').doc(studentUid)
  const cardsRef = parentRef.collection('cards')

  // Determine the union date range to cover both windows in one reviewed-cards query
  const allDates = [...new Set([...weekDays, ...rollingDays])].sort()
  const { start: queryStart } = getClientLocalDayTimestampBounds(allDates[0], utcOffsetMinutes)
  const { end: queryEnd } = getClientLocalDayTimestampBounds(allDates[allDates.length - 1], utcOffsetMinutes)

  const now = new Date()

  // Per-day due counts for the Practice Activity grid (7 parallel count() queries)
  const weekDayDueCountPromises = weekDays.map((d) => {
    const { end } = getClientLocalDayTimestampBounds(d, utcOffsetMinutes)
    return cardsRef.where('due', '<=', AdminTimestamp.fromDate(end)).count().get()
  })

  const [parentSnap, reviewedSnap, dueForReviewSnap, ...weekDueCounts] = await Promise.all([
    parentRef.get(),
    cardsRef
      .where('lastReview', '>=', AdminTimestamp.fromDate(queryStart))
      .where('lastReview', '<', AdminTimestamp.fromDate(queryEnd))
      .select('lastReview')
      .get(),
    cardsRef.where('due', '<=', AdminTimestamp.fromDate(now)).count().get(),
    ...weekDayDueCountPromises,
  ])

  const parentData = parentSnap.data() ?? {}
  const stateCounts = (parentData.stateCounts ?? {}) as Record<string, number>
  const dueForReview = dueForReviewSnap.data().count

  const vocabCounts: VocabCounts = {
    all: typeof parentData.totalCards === 'number' ? parentData.totalCards : 0,
    new: stateCounts.new ?? 0,
    learning: stateCounts.learning ?? 0,
    review: stateCounts.review ?? 0,
    relearning: stateCounts.relearning ?? 0,
    dueForReview,
  }

  // Bucket reviewed cards by local date
  const reviewCountByDate = new Map<string, number>()
  for (const doc of reviewedSnap.docs) {
    const lastReview = doc.data().lastReview as AdminTimestamp | null | undefined
    if (!lastReview) continue
    const dateStr = toLocalDateStr(lastReview.toDate(), utcOffsetMinutes)
    reviewCountByDate.set(dateStr, (reviewCountByDate.get(dateStr) ?? 0) + 1)
  }

  // Per-day status entries for the Practice Activity grid
  const dailyVocabStatus = new Map<string, { cardsReviewed: number; cardsDue: number }>()
  for (let i = 0; i < weekDays.length; i++) {
    const date = weekDays[i]
    dailyVocabStatus.set(date, {
      cardsReviewed: reviewCountByDate.get(date) ?? 0,
      cardsDue: weekDueCounts[i].data().count,
    })
  }

  // Rolling 7-day daily card counts (for the bar chart)
  const dailyCardCounts: VocabDayStats[] = rollingDays.map((date) => ({
    date,
    cardsReviewed: reviewCountByDate.get(date) ?? 0,
  }))

  const activeDays = dailyCardCounts.filter((d) => d.cardsReviewed > 0)
  const totalReviewed = activeDays.reduce((sum, d) => sum + d.cardsReviewed, 0)
  const cardsPerDayAvg = activeDays.length > 0 ? Math.round(totalReviewed / activeDays.length) : 0

  const vocabActivity: VocabActivityStats = {
    cardsPerDayAvg,
    // Card schema has no per-review accuracy field; left as 0 until data is available
    weeklyAccuracyAvg: 0,
    dueForReview,
    dailyCardCounts,
  }

  return { vocabCounts, vocabActivity, dailyVocabStatus }
}

export function vocabActivityStatus(cardsReviewed: number, cardsDue: number): ActivityStatus {
  if (cardsReviewed === 0) return 'not_attempted'
  if (cardsReviewed >= cardsDue) return 'complete'
  return 'partial'
}
