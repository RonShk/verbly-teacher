export type VocabStatus = 'new' | 'learning' | 'review' | 'relearning'
export type VocabStatusFilter = VocabStatus | 'all' | 'due_soon'

export interface VocabCardItem {
  id: string
  englishWord: string
  spanishWord: string
  status: VocabStatus
  lastReviewedAt: string | null
}

export interface VocabCounts {
  all: number
  new: number
  learning: number
  review: number
  relearning: number
  dueSoon: number
}

export interface VocabListResponse {
  total: number
  page: number
  pageSize: number
  totalPages: number
  items: VocabCardItem[]
  counts: VocabCounts
}
