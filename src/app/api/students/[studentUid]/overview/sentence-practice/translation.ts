import { getTodayDateString } from '@/lib/server/dayBounds'
import type { ModeTodaySummary } from '@/types/student-overview'

import {
  buildModeTodaySummary,
  fetchSentencePracticeAssignments,
} from './sentencePractice'

export async function fetchTranslationToday(
  studentUid: string,
  utcOffsetMinutes: number,
): Promise<ModeTodaySummary> {
  const todayStr = getTodayDateString(utcOffsetMinutes)
  const assignments = await fetchSentencePracticeAssignments(
    studentUid,
    todayStr,
    'TRANSLATION',
  )

  return buildModeTodaySummary(assignments)
}
