import { getTodayDateString } from '@/lib/server/dayBounds'
import type { StudentOverviewResponse } from '@/types/student-overview'

import { fetchProductionToday } from './sentence-practice/production'
import { fetchTranslationToday } from './sentence-practice/translation'
import { buildStudentHeader, fetchStudentHeaderInputs } from './student-header/studentHeader'
import { fetchVocabOverview } from './vocab/vocab'

export async function buildStudentOverview(tutorUid: string, studentUid: string, utcOffsetMinutes: number): Promise<StudentOverviewResponse> {
  const todayStr = getTodayDateString(utcOffsetMinutes)

  const [vocab, production, translation, headerInputs] = await Promise.all([
    fetchVocabOverview(studentUid, todayStr, utcOffsetMinutes),
    fetchProductionToday(studentUid, utcOffsetMinutes),
    fetchTranslationToday(studentUid, utcOffsetMinutes),
    fetchStudentHeaderInputs(tutorUid, studentUid)
  ])

  const student = buildStudentHeader(
    headerInputs,
    studentUid,
    vocab.health.total,
    vocab.lastReviewAt
  )

  return {
    student,
    today: {
      vocab: vocab.today,
      production,
      translation,
    },
    vocabHealth: vocab.health
  }
}
