import { getAdminFirestore } from '@/lib/firebase/admin'
import type { ProposedAddition } from '@/types/chat'

import { MAX_PROPOSAL_WORDS, type ChatTool, type ToolContext } from './shared'

/**
 * Human-in-the-loop: emits an editable confirmation card to the UI and writes
 * nothing. The actual add happens when the tutor confirms, via
 * POST /api/students/[studentUid]/vocab.
 */
export const proposeVocabAdditions: ChatTool = {
  declaration: {
    type: 'function',
    name: 'propose_vocab_additions',
    description:
      "Shows the tutor an editable confirmation card with new vocabulary to add to the student's deck. Words the student already has are dropped automatically, so you do NOT need to check the deck first — just propose. Nothing is written until the tutor clicks confirm, so never claim the words were added — say the proposal is ready to review.",
    parameters: {
      type: 'object',
      properties: {
        words: {
          type: 'array',
          description: `Word pairs to propose (max ${MAX_PROPOSAL_WORDS}).`,
          items: {
            type: 'object',
            properties: {
              spanish: { type: 'string', description: 'Word or phrase in the learning language.' },
              english: { type: 'string', description: 'Meaning in the language the student already knows.' },
            },
            required: ['spanish', 'english'],
          },
        },
      },
      required: ['words'],
    },
  },
  execute: async (args, ctx: ToolContext) => {
    const words = parseWordPairs(args.words)
    if (words.length === 0) {
      return { error: 'No valid word pairs. Each item needs non-empty "spanish" and "english" strings.' }
    }

    // addVocabCards rejects duplicates at write time. Filtering here instead
    // means the tutor never confirms a card only to be told afterwards that the
    // words were already in the deck.
    const existing = await findExistingWords(ctx.studentUid, words)
    const fresh: ProposedAddition[] = []
    const alreadyInDeck: string[] = []
    const seen = new Set<string>()

    for (const word of words) {
      const key = word.spanish.toLowerCase()
      if (existing.has(key)) {
        alreadyInDeck.push(word.spanish)
        continue
      }
      // The model sometimes repeats a word inside one batch too.
      if (seen.has(key)) continue
      seen.add(key)
      fresh.push(word)
    }

    if (fresh.length === 0) {
      return {
        status: 'nothing_to_propose',
        alreadyInDeck,
        note: 'No card was shown because every word is already in the deck. Tell the tutor that plainly and offer different words.',
      }
    }

    ctx.emit({ type: 'proposal', proposal: { kind: 'add', words: fresh } })
    return {
      status: 'awaiting_tutor_confirmation',
      wordCount: fresh.length,
      alreadyInDeck,
      note: 'An editable confirmation card is now displayed with the new words only. They are NOT added yet — the tutor must click confirm. If alreadyInDeck is non-empty, mention in one clause that those were skipped as already in the deck.',
    }
  },
}

/** Firestore's cap on values in a single `in` filter. */
const IN_FILTER_LIMIT = 30

/**
 * Which of the proposed words the student already has, as a lower-cased set.
 *
 * Asks Firestore only about the words being proposed rather than reading the
 * whole deck, so the cost is the number of matches (usually zero) instead of
 * hundreds of documents. learningLanguageWord is stored with its original
 * casing and Firestore has no case-insensitive operator, so each word is looked
 * up under the spellings a duplicate would realistically be stored as. Anything
 * stranger is still caught by the duplicate check inside addVocabCards when the
 * tutor confirms.
 */
async function findExistingWords(studentUid: string, words: ProposedAddition[]): Promise<Set<string>> {
  const spellings = new Set<string>()
  for (const word of words) {
    const lower = word.spanish.toLowerCase()
    spellings.add(word.spanish)
    spellings.add(lower)
    spellings.add(lower.charAt(0).toUpperCase() + lower.slice(1))
  }

  const cardsRef = getAdminFirestore()
    .collection('student_vocab')
    .doc(studentUid)
    .collection('cards')

  const all = [...spellings]
  const queries = []
  for (let i = 0; i < all.length; i += IN_FILTER_LIMIT) {
    const chunk = all.slice(i, i + IN_FILTER_LIMIT)
    queries.push(cardsRef.where('learningLanguageWord', 'in', chunk).select('learningLanguageWord').get())
  }

  const existing = new Set<string>()
  for (const snap of await Promise.all(queries)) {
    for (const doc of snap.docs) {
      const stored = ((doc.data().learningLanguageWord as string | undefined) ?? '').trim().toLowerCase()
      if (stored) {
        existing.add(stored)
      }
    }
  }
  return existing
}

function parseWordPairs(value: unknown): ProposedAddition[] {
  if (!Array.isArray(value)) return []
  const pairs: ProposedAddition[] = []
  for (const item of value.slice(0, MAX_PROPOSAL_WORDS)) {
    if (typeof item !== 'object' || item === null) continue
    const { spanish, english } = item as Record<string, unknown>
    if (typeof spanish !== 'string' || typeof english !== 'string') continue
    if (!spanish.trim() || !english.trim()) continue
    pairs.push({ spanish: spanish.trim(), english: english.trim() })
  }
  return pairs
}
