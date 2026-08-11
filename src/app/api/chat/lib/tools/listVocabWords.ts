import { fetchVocabCards } from '@/app/api/students/[studentUid]/vocab/fetchVocabCards'
import type { VocabStatusFilter } from '@/types/student-vocab'

import { clampNumber, type ChatTool, type ToolContext } from './shared'

const MAX_LIST_LIMIT = 50
const VALID_STATUSES: VocabStatusFilter[] = ['all', 'new', 'learning', 'review', 'relearning', 'due_soon']

/** Reads the student's vocabulary cards — also how the model gets real card ids before removals. */
export const listVocabWords: ChatTool = {
  declaration: {
    type: 'function',
    name: 'list_vocab_words',
    description:
      "The student's vocabulary cards with FSRS learning state, due date and last review. Always call this first to get real card ids before proposing removals. Supports case-insensitive substring search in both languages.",
    parameters: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['all', 'new', 'learning', 'review', 'relearning', 'due_soon'],
          description: 'Filter by FSRS state. due_soon = due within 7 days. Default all.',
        },
        search: { type: 'string', description: 'Substring to match in either language.' },
        limit: { type: 'number', description: `Max cards to return. Default 25, max ${MAX_LIST_LIMIT}.` },
      },
    },
  },
  execute: async (args, ctx: ToolContext) => {
    let status: VocabStatusFilter = 'all'
    if (VALID_STATUSES.includes(args.status as VocabStatusFilter)) {
      status = args.status as VocabStatusFilter
    }

    let search = ''
    if (typeof args.search === 'string') {
      search = args.search.trim()
    }

    const limit = clampNumber(args.limit, 1, MAX_LIST_LIMIT, 25)

    const result = await fetchVocabCards({
      studentUid: ctx.studentUid,
      page: 1,
      pageSize: limit,
      status,
      q: search,
    })

    return {
      deckCounts: result.counts,
      matchCount: result.totalQueryMatchCount,
      cards: result.words.map((w) => ({
        cardId: w.id,
        spanish: w.spanishWord,
        english: w.englishWord,
        status: w.status,
        dueAt: w.dueAt,
        lastReviewedAt: w.lastReviewedAt,
      })),
    }
  },
}
