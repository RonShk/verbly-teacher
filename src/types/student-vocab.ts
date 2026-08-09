export type VocabStatus = 'new' | 'learning' | 'review' | 'relearning'
export type VocabStatusFilter = VocabStatus | 'all' | 'due_soon'

export interface VocabCardItem {
  id: string
  englishWord: string
  spanishWord: string
  status: VocabStatus
  lastReviewedAt: string | null
  dueAt: string | null
}

export interface VocabCounts {
  totalWords: number
  new: number
  learning: number
  review: number
  relearning: number
  dueSoon: number
}

/** Identity of the student the list belongs to (for the page header). */
export interface VocabStudent {
  name: string
  email: string
  linkedAt: string | null
}

export interface VocabListResponse {
  totalQueryMatchCount: number
  page: number
  totalPages: number
  words: VocabCardItem[]
  counts: VocabCounts
  student: VocabStudent
}
