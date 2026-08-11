import { getAdminFirestore } from '@/lib/firebase/admin'
import type { ProposedRemoval } from '@/types/chat'

import { MAX_PROPOSAL_WORDS, type ChatTool, type ToolContext } from './shared'

/**
 * Human-in-the-loop: resolves the requested card ids to real words, emits a
 * confirmation card to the UI and deletes nothing. The actual removal happens
 * when the tutor confirms, via DELETE /api/students/[studentUid]/vocab.
 */
export const proposeVocabRemovals: ChatTool = {
  declaration: {
    type: 'function',
    name: 'propose_vocab_removals',
    description:
      "Shows the tutor a confirmation card to remove existing vocabulary cards from the student's deck. Pass real card ids from list_vocab_words. Nothing is deleted until the tutor clicks confirm.",
    parameters: {
      type: 'object',
      properties: {
        cardIds: {
          type: 'array',
          items: { type: 'string' },
          description: `Ids of cards to remove (max ${MAX_PROPOSAL_WORDS}).`,
        },
      },
      required: ['cardIds'],
    },
  },
  execute: async (args, ctx: ToolContext) => {
    let cardIds: string[] = []
    if (Array.isArray(args.cardIds)) {
      cardIds = args.cardIds
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
        .slice(0, MAX_PROPOSAL_WORDS)
    }
    if (cardIds.length === 0) {
      return { error: 'No card ids given. Call list_vocab_words first and pass real card ids.' }
    }

    const db = getAdminFirestore()
    const cardsRef = db.collection('student_vocab').doc(ctx.studentUid).collection('cards')
    const snaps = await db.getAll(...cardIds.map((id) => cardsRef.doc(id)))

    const words: ProposedRemoval[] = []
    const unknownIds: string[] = []
    for (const snap of snaps) {
      if (!snap.exists) {
        unknownIds.push(snap.id)
        continue
      }
      const d = snap.data()
      words.push({
        cardId: snap.id,
        spanish: (d?.learningLanguageWord as string | undefined) ?? '',
        english: (d?.englishWord as string | undefined) ?? '',
      })
    }
    if (words.length === 0) {
      return { error: 'None of those card ids exist. Call list_vocab_words for real ids.', unknownIds }
    }

    ctx.emit({ type: 'proposal', proposal: { kind: 'remove', words } })
    return {
      status: 'awaiting_tutor_confirmation',
      wordCount: words.length,
      unknownIds,
      note: 'A confirmation card is now displayed. The cards are NOT removed yet — the tutor must click confirm.',
    }
  },
}
