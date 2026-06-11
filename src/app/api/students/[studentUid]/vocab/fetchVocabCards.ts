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

function sortAndPage(items: VocabCardItem[], skip: number, pageSize: number) {
  items.sort((a, b) => a.englishWord.localeCompare(b.englishWord))
  return { total: items.length, items: items.slice(skip, skip + pageSize) }
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
    all: (d.totalCards as number) ?? 0,
    new: sc.new ?? 0,
    learning: sc.learning ?? 0,
    review: sc.review ?? 0,
    relearning: sc.relearning ?? 0,
    dueSoon: dueSoonSnap.data().count,
  }
}

export async function fetchVocabCards(params: FetchVocabCardsParams): Promise<VocabListResponse> {
  const { studentUid, page, status, q } = params
  const pageSize = Math.min(Math.max(1, params.pageSize), PAGE_SIZE_CAP)
  const skip = (page - 1) * pageSize

  const db = getAdminFirestore()
  const parentRef = db.collection('student_vocab').doc(studentUid)
  const cardsRef = parentRef.collection('cards')

  const now = new Date()
  const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  // counts are always global (unaffected by current filter/search)
  const counts = await fetchCounts(parentRef, cardsRef, sevenDaysLater)

  let total: number
  let items: VocabCardItem[]

  if (q) {
    // In-memory search — works with existing schema.
    // TODO: once englishWordLower / learningLanguageWordLower fields are populated,
    // replace with Firestore prefix range queries for O(log n) instead of O(n).
    const snap = await cardsRef.get()
    const qLower = q.toLowerCase()
    const filtered = snap.docs
      .filter((doc) => {
        const d = doc.data()
        const matchesSearch =
          (d.englishWord as string ?? '').toLowerCase().includes(qLower) ||
          (d.learningLanguageWord as string ?? '').toLowerCase().includes(qLower)
        if (!matchesSearch) return false
        if (status === 'all') return true
        if (status === 'due_soon') {
          const due = (d.due as Timestamp | undefined)?.toDate()
          return !!due && due <= sevenDaysLater
        }
        return (FSRS_STATE_TO_STATUS[d.state as number] ?? 'new') === status
      })
      .map(docToItem)
    ;({ total, items } = sortAndPage(filtered, skip, pageSize))
  } else {
    let query: Query = cardsRef
    if (status === 'due_soon') {
      query = cardsRef.where('due', '<=', sevenDaysLater)
    } else if (status !== 'all') {
      query = cardsRef.where('state', '==', STATUS_TO_FSRS[status])
    }

    const snap = await query.get()
    ;({ total, items } = sortAndPage(snap.docs.map(docToItem), skip, pageSize))
  }

  return {
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    items,
    counts,
  }
}
