export type PracticeStatus = 'not_started' | 'in_progress' | 'complete'

export interface StudentOverviewStudent {
  uid: string
  name: string
  email: string
  linkedAt: string | null
  lastActiveAt: string | null
  vocabTotal: number
}

export interface VocabTodaySummary {
  status: PracticeStatus
  reviewedCount: number
}

export interface ModeTodaySummary {
  status: PracticeStatus
  completedCount: number
  totalCount: number
  scorePercent: number | null
}

export interface VocabHealthSummary {
  new: number
  learning: number
  review: number
  relearning: number
  total: number
}

export interface StudentOverviewResponse {
  student: StudentOverviewStudent
  today: {
    vocab: VocabTodaySummary
    production: ModeTodaySummary
    translation: ModeTodaySummary
  }
  vocabHealth: VocabHealthSummary
}
