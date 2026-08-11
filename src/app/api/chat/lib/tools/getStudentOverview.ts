import { buildTodaysPractice } from '@/app/api/dashboard/lib/practice'
import { fetchDashboardSources } from '@/app/api/dashboard/lib/sources'
import { buildStats } from '@/app/api/dashboard/lib/stats'
import { buildVocabHealth } from '@/app/api/dashboard/lib/health'

import type { ChatTool, ToolContext } from './shared'

/**
 * Live status snapshot, computed by the same dashboard builders the home page
 * uses so the AI's numbers always match what the tutor sees there.
 */
export const getStudentOverview: ChatTool = {
  declaration: {
    type: 'function',
    name: 'get_student_overview',
    description:
      "Live overview of the selected student: profile, last-active time, current streak, minutes practiced today, vocabulary deck health (card counts by FSRS state, words due now), and today's practice status for the VOCAB, PRODUCTION and TRANSLATION modes. Call this only when the tutor asks about activity, streaks, due words or general status. Do NOT call it as background context before proposing vocabulary or running another tool.",
    parameters: { type: 'object', properties: {} },
  },
  execute: async (_args, ctx: ToolContext) => {
    const sources = await fetchDashboardSources(ctx.tutorUid, ctx.studentUid, ctx.timezoneOffsetMinutes)
    if (!sources) return { error: 'Student is not on your roster.' }

    const stats = buildStats(sources)
    const latestCompleted = sources.completedAssignments[0]?.completedAt ?? null
    const lastReview = sources.vocabParent.lastReviewAt
    let lastActiveAt = latestCompleted
    if (lastReview && (!lastActiveAt || lastReview > lastActiveAt)) {
      lastActiveAt = lastReview
    }

    return {
      student: {
        name: sources.roster.name,
        email: sources.roster.email,
        linkedAt: sources.roster.linkedAt?.toISOString() ?? null,
      },
      lastActiveAt: lastActiveAt?.toISOString() ?? null,
      currentStreakDays: stats.currentStreakDays,
      minutesPracticedToday: stats.timeSpentTodayMinutes,
      wordsReviewedToday: stats.wordsReviewedToday,
      wordsDueNow: stats.wordsDueNow,
      vocabHealth: buildVocabHealth(sources),
      todaysPractice: buildTodaysPractice(sources),
    }
  },
}
