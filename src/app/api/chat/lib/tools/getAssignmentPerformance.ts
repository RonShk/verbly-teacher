import { Timestamp } from 'firebase-admin/firestore'

import { getAdminFirestore } from '@/lib/firebase/admin'

import { clampNumber, type ChatTool, type ToolContext } from './shared'

const MAX_PERFORMANCE_DAYS = 180
const PERFORMANCE_FETCH_LIMIT = 100

/** Real graded assignment history with per-type accuracy summaries. */
export const getAssignmentPerformance: ChatTool = {
  declaration: {
    type: 'function',
    name: 'get_assignment_performance',
    description:
      "The student's real graded assignment history. PRODUCTION = writing in the learning language (output skill), TRANSLATION = understanding the learning language (comprehension). Returns per-type accuracy averages and every graded assignment with date and score inside the window. Use for any question about accuracy, scores, weak areas or progress over time.",
    parameters: {
      type: 'object',
      properties: {
        days: {
          type: 'number',
          description: `Lookback window in days. Default 30, max ${MAX_PERFORMANCE_DAYS}.`,
        },
        type: {
          type: 'string',
          enum: ['PRODUCTION', 'TRANSLATION', 'ALL'],
          description: 'Filter by assignment type. Default ALL.',
        },
      },
    },
  },
  execute: async (args, ctx: ToolContext) => {
    const days = clampNumber(args.days, 1, MAX_PERFORMANCE_DAYS, 30)
    let typeFilter: 'PRODUCTION' | 'TRANSLATION' | 'ALL' = 'ALL'
    if (args.type === 'PRODUCTION' || args.type === 'TRANSLATION') {
      typeFilter = args.type
    }

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const snap = await getAdminFirestore()
      .collection('user_assignments')
      .where('userId', '==', ctx.studentUid)
      .where('completionStatus', '==', 'COMPLETED')
      .where('completedAt', '>=', Timestamp.fromDate(since))
      .orderBy('completedAt', 'desc')
      .limit(PERFORMANCE_FETCH_LIMIT)
      .get()

    const assignments = snap.docs
      .map((doc) => {
        const d = doc.data()
        const completedAt = (d.completedAt as Timestamp | undefined)?.toDate()
        if (!completedAt) return null

        let scorePercent: number | null = null
        if (typeof d.averageScorePercent === 'number') {
          scorePercent = Math.round(d.averageScorePercent)
        }

        let questionsCompleted: number | null = null
        if (typeof d.completedQuestionCount === 'number') {
          questionsCompleted = d.completedQuestionCount
        }

        return {
          type: (d.type as string | undefined) ?? '',
          completedAt: completedAt.toISOString(),
          scorePercent,
          questionsCompleted,
        }
      })
      .filter((a): a is NonNullable<typeof a> => a != null)
      .filter((a) => typeFilter === 'ALL' || a.type === typeFilter)

    return {
      windowDays: days,
      typeFilter,
      summary: {
        production: summarizeScores(assignments.filter((a) => a.type === 'PRODUCTION')),
        translation: summarizeScores(assignments.filter((a) => a.type === 'TRANSLATION')),
      },
      assignments,
    }
  },
}

function summarizeScores(rows: Array<{ scorePercent: number | null; completedAt: string }>) {
  const scores = rows.map((r) => r.scorePercent).filter((s): s is number => s != null)
  if (scores.length === 0) return { completedCount: rows.length, averageScorePercent: null }
  return {
    completedCount: rows.length,
    averageScorePercent: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    bestScorePercent: Math.max(...scores),
    worstScorePercent: Math.min(...scores),
    latestScorePercent: scores[0],
  }
}
