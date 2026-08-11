import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { createEmptyCard } from 'ts-fsrs'

import { getAdminFirestore } from '@/lib/firebase/admin'

/** Matches the batch cap the chat proposals use. */
export const MAX_MUTATION_WORDS = 50

export interface WordPair {
  spanish: string
  english: string
}

export interface AddResult {
  added: number
  /** Learning-language words skipped because they already exist in the deck. */
  skippedDuplicates: string[]
}

export interface RemoveResult {
  removed: number
  missingIds: string[]
}

const FSRS_STATE_BUCKETS = ['new', 'learning', 'review', 'relearning'] as const

function stateBucket(state: unknown): (typeof FSRS_STATE_BUCKETS)[number] {
  return FSRS_STATE_BUCKETS[typeof state === 'number' ? state : 0] ?? 'new'
}

/**
 * Creates FSRS-new cards under student_vocab/{uid}/cards, mirroring the field
 * shape the student app's Cloud Functions write, and keeps the parent deck
 * summary (totalCards / stateCounts) in sync.
 */
export async function addVocabCards(studentUid: string, words: WordPair[]): Promise<AddResult> {
  const db = getAdminFirestore()
  const parentRef = db.collection('student_vocab').doc(studentUid)
  const cardsRef = parentRef.collection('cards')

  const existingSnap = await cardsRef.select('learningLanguageWord').get()
  const existing = new Set(
    existingSnap.docs.map((doc) =>
      ((doc.data().learningLanguageWord as string | undefined) ?? '').trim().toLowerCase(),
    ),
  )

  const now = new Date()
  const nowTs = Timestamp.fromDate(now)
  const batch = db.batch()
  let added = 0
  const skippedDuplicates: string[] = []

  for (const word of words.slice(0, MAX_MUTATION_WORDS)) {
    const spanish = word.spanish.trim()
    const english = word.english.trim()
    if (!spanish || !english) continue
    if (existing.has(spanish.toLowerCase())) {
      skippedDuplicates.push(spanish)
      continue
    }
    existing.add(spanish.toLowerCase())

    const card = createEmptyCard(now)
    batch.set(cardsRef.doc(), {
      learningLanguageWord: spanish,
      englishWord: english,
      due: Timestamp.fromDate(card.due),
      stability: card.stability,
      difficulty: card.difficulty,
      elapsedDays: card.elapsed_days,
      scheduledDays: card.scheduled_days,
      learningSteps: card.learning_steps,
      reps: card.reps,
      lapses: card.lapses,
      state: card.state as number,
      lastReview: null,
      createdAt: nowTs,
    })
    added++
  }

  if (added > 0) {
    batch.set(
      parentRef,
      {
        totalCards: FieldValue.increment(added),
        stateCounts: { new: FieldValue.increment(added) },
        updatedAt: nowTs,
      },
      { merge: true },
    )
    await batch.commit()
  }

  return { added, skippedDuplicates }
}

/** Deletes cards by id and decrements the parent deck summary accordingly. */
export async function removeVocabCards(studentUid: string, cardIds: string[]): Promise<RemoveResult> {
  const db = getAdminFirestore()
  const parentRef = db.collection('student_vocab').doc(studentUid)
  const cardsRef = parentRef.collection('cards')

  const ids = [...new Set(cardIds)].slice(0, MAX_MUTATION_WORDS)
  const snaps = await db.getAll(...ids.map((id) => cardsRef.doc(id)))

  const batch = db.batch()
  const bucketDeltas: Record<string, number> = {}
  let removed = 0
  const missingIds: string[] = []

  for (const snap of snaps) {
    if (!snap.exists) {
      missingIds.push(snap.id)
      continue
    }
    const bucket = stateBucket(snap.data()?.state)
    bucketDeltas[bucket] = (bucketDeltas[bucket] ?? 0) + 1
    batch.delete(snap.ref)
    removed++
  }

  if (removed > 0) {
    const stateCounts = Object.fromEntries(
      Object.entries(bucketDeltas).map(([bucket, count]) => [bucket, FieldValue.increment(-count)]),
    )
    batch.set(
      parentRef,
      { totalCards: FieldValue.increment(-removed), stateCounts, updatedAt: Timestamp.now() },
      { merge: true },
    )
    await batch.commit()
  }

  return { removed, missingIds }
}
