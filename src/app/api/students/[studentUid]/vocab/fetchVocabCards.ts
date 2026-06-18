import type { CollectionReference, Query, QueryDocumentSnapshot, Timestamp } from 'firebase-admin/firestore'

import { getAdminFirestore } from '@/lib/firebase/admin'
import { FSRS_LEARNING, FSRS_NEW, FSRS_RELEARNING, FSRS_REVIEW } from '../overview/vocab/vocab'
import type { VocabCardItem, VocabCounts, VocabListResponse, VocabStatusFilter } from '@/types/student-vocab'

const PAGE_SIZE_CAP = 50

const FSRS_STATE_TO_STATUS: Record<number, VocabCardItem['status']> = {
  [FSRS_NEW]: 'new',
  [FSRS_LEARNING]: 'learning',
  [FSRS_REVIEW]: 'review',
  [FSRS_RELEARNING]: 'relearning',
}

const STATUS_TO_FSRS: Record<string, number> = {
  new: FSRS_NEW,
  learning: FSRS_LEARNING,
  review: FSRS_REVIEW,
  relearning: FSRS_RELEARNING,
}

export interface FetchVocabCardsParams {
  studentUid: string
  page: number
  pageSize: number
  status: VocabStatusFilter
  q: string
}

function docToItem(doc: QueryDocumentSnapshot): VocabCardItem {
  const d = doc.data()
  const lastReview = d.lastReview as Timestamp | null | undefined
  return {
    id: doc.id,
    englishWord: d.englishWord ?? '',
    spanishWord: d.learningLanguageWord ?? '',
    status: FSRS_STATE_TO_STATUS[d.state as number] ?? 'new',
    lastReviewedAt: lastReview ? lastReview.toDate().toISOString() : null,
  }
}

// 2 Firestore reads: parent doc (pre-computed state counts) + 1 count() for dueSoon.
async function fetchCounts(
  parentRef: FirebaseFirestore.DocumentReference,
  cardsRef: CollectionReference,
  sevenDaysLater: Date,
): Promise<VocabCounts> {
  const [parentSnap, dueSoonSnap] = await Promise.all([
    parentRef.get(),
    cardsRef.where('due', '<=', sevenDaysLater).count().get(),
  ])
  const d = parentSnap.data() ?? {}
  const sc = (d.stateCounts ?? {}) as Record<string, number>
  return {
    totalWords: (d.totalCards as number | undefined) ?? 0,
    new: sc.new ?? 0,
    learning: sc.learning ?? 0,
    review: sc.review ?? 0,
    relearning: sc.relearning ?? 0,
    dueSoon: dueSoonSnap.data().count,
  }
}

// Non-search path: server-side pagination — reads only pageSize docs per request.
// Requires a composite index in vocab_forge/firestore.indexes.json:
//   collectionGroup: "cards", fields: [{ state: ASC }, { englishWord: ASC }]
async function fetchPage(
  cardsRef: CollectionReference,
  status: VocabStatusFilter,
  sevenDaysLater: Date,
  skip: number,
  pageSize: number,
): Promise<VocabCardItem[]> {
  let query: Query
  if (status === 'due_soon') {
    // Firestore requires orderBy on the inequality field first, so due_soon sorts by due date asc.
    query = cardsRef.where('due', '<=', sevenDaysLater).orderBy('due').limit(pageSize).offset(skip)
  } else if (status !== 'all') {
    query = cardsRef.where('state', '==', STATUS_TO_FSRS[status]).orderBy('englishWord').limit(pageSize).offset(skip)
  } else {
    query = cardsRef.orderBy('englishWord').limit(pageSize).offset(skip)
  }
  const snap = await query.get()
  return snap.docs.map(docToItem)
}

// Search path: reads all docs in the status-filtered set and searches in memory.
// Tradeoff: O(n) reads where n = cards matching the status filter, not just pageSize.
// Firestore does not support substring search, so this is the accepted limitation.
async function fetchWithSearch(
  cardsRef: CollectionReference,
  status: VocabStatusFilter,
  q: string,
  sevenDaysLater: Date,
  skip: number,
  pageSize: number,
): Promise<{ totalQueryMatchCount: number; words: VocabCardItem[] }> {
  let query: Query = cardsRef
  if (status === 'due_soon') {
    query = cardsRef.where('due', '<=', sevenDaysLater)
  } else if (status !== 'all') {
    query = cardsRef.where('state', '==', STATUS_TO_FSRS[status])
  }
  const snap = await query.get()
  const qLower = q.toLowerCase()
  const filtered = snap.docs
    .filter((doc) => {
      const d = doc.data()
      return (
        ((d.englishWord as string | undefined) ?? '').toLowerCase().includes(qLower) ||
        ((d.learningLanguageWord as string | undefined) ?? '').toLowerCase().includes(qLower)
      )
    })
    .map(docToItem)
  filtered.sort((a, b) => a.englishWord.localeCompare(b.englishWord))
  return {
    totalQueryMatchCount: filtered.length,
    words: filtered.slice(skip, skip + pageSize),
  }
}

function totalQueryMatchFromCounts(counts: VocabCounts, status: VocabStatusFilter): number {
  switch (status) {
    case 'new': return counts.new
    case 'learning': return counts.learning
    case 'review': return counts.review
    case 'relearning': return counts.relearning
    case 'due_soon': return counts.dueSoon
    default: return counts.totalWords
  }
}

function computeTotalPages(totalQueryMatchCount: number, pageSize: number): number {
  if (totalQueryMatchCount === 0) return 0
  return Math.ceil(totalQueryMatchCount / pageSize)
}

export async function fetchVocabCards(params: FetchVocabCardsParams): Promise<VocabListResponse> {
  const { studentUid, page, status, q } = params
  const pageSize = Math.min(Math.max(1, params.pageSize), PAGE_SIZE_CAP)
  const skip = (page - 1) * pageSize

  const db = getAdminFirestore()
  const parentRef = db.collection('student_vocab').doc(studentUid)
  const cardsRef = parentRef.collection('cards') as CollectionReference

  const sevenDaysLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  if (q) {
    const [counts, { totalQueryMatchCount, words }] = await Promise.all([
      fetchCounts(parentRef, cardsRef, sevenDaysLater),
      fetchWithSearch(cardsRef, status, q, sevenDaysLater, skip, pageSize),
    ])
    return {
      totalQueryMatchCount,
      page,
      totalPages: computeTotalPages(totalQueryMatchCount, pageSize),
      words,
      counts,
    }
  }

  const [counts, words] = await Promise.all([
    fetchCounts(parentRef, cardsRef, sevenDaysLater),
    fetchPage(cardsRef, status, sevenDaysLater, skip, pageSize),
  ])
  const totalQueryMatchCount = totalQueryMatchFromCounts(counts, status)
  return {
    totalQueryMatchCount,
    page,
    totalPages: computeTotalPages(totalQueryMatchCount, pageSize),
    words,
    counts,
  }
}
