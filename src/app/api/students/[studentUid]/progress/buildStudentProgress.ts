import { getTodayDateString } from '@/lib/server/dayBounds'
import type { DayActivity, StudentProgressResponse } from '@/types/student-progress'
import { fetchVocabProgress, vocabActivityStatus } from './vocab/vocabProgress'
import { fetchSessionProgress } from './sessions/sessionProgress'

function addDays(dateStr: string, n: number): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day + n)).toISOString().slice(0, 10)
}

function resolveWeekStart(weekStartParam: string | undefined, utcOffsetMinutes: number): string {
  if (weekStartParam && /^\d{4}-\d{2}-\d{2}$/.test(weekStartParam)) {
    return weekStartParam
  }
  const todayStr = getTodayDateString(utcOffsetMinutes)
  const [year, month, day] = todayStr.split('-').map(Number)
  const d = new Date(Date.UTC(year, month - 1, day))
  // Rewind to the most recent Sunday
  return addDays(todayStr, -d.getUTCDay())
}

export async function buildStudentProgress(
  studentUid: string,
  utcOffsetMinutes: number,
  weekStartParam?: string,
): Promise<StudentProgressResponse> {
  const weekStart = resolveWeekStart(weekStartParam, utcOffsetMinutes)
  const weekEnd = addDays(weekStart, 6)
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const todayStr = getTodayDateString(utcOffsetMinutes)
  const rollingDays = Array.from({ length: 7 }, (_, i) => addDays(todayStr, i - 6))

  const [vocabResult, productionResult, translationResult] = await Promise.all([
    fetchVocabProgress(studentUid, weekDays, rollingDays, utcOffsetMinutes),
    fetchSessionProgress(studentUid, 'PRODUCTION', weekDays, rollingDays),
    fetchSessionProgress(studentUid, 'TRANSLATION', weekDays, rollingDays),
  ])

  const days: DayActivity[] = weekDays.map((date) => {
    const vocabDay = vocabResult.dailyVocabStatus.get(date)!
    const vocab = vocabActivityStatus(vocabDay.cardsReviewed, vocabDay.cardsDue)
    const production = productionResult.dailyStatus.get(date) ?? 'not_attempted'
    const translation = translationResult.dailyStatus.get(date) ?? 'not_attempted'

    // dailyAvg uses production + translation accuracy only (vocab has no per-session accuracy)
    const scores: number[] = []
    const prodAccuracy = productionResult.dailyAccuracy.get(date)
    const transAccuracy = translationResult.dailyAccuracy.get(date)
    if (production !== 'not_attempted' && prodAccuracy != null) scores.push(prodAccuracy)
    if (translation !== 'not_attempted' && transAccuracy != null) scores.push(transAccuracy)
    const dailyAvg = scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : null

    return {
      date,
      vocab,
      production,
      translation,
      productionAccuracy: productionResult.dailyAccuracy.get(date) ?? null,
      translationAccuracy: translationResult.dailyAccuracy.get(date) ?? null,
      dailyAvg,
    }
  })

  return {
    weekStart,
    weekEnd,
    days,
    vocab: vocabResult.vocabActivity,
    production: productionResult.stats,
    translation: translationResult.stats,
    vocabCounts: vocabResult.vocabCounts,
  }
}
