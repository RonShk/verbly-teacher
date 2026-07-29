export type ActivityStatus = 'not_attempted' | 'partial' | 'complete'

export interface DayActivity {
  date: string
  vocab: ActivityStatus
  production: ActivityStatus
  translation: ActivityStatus
  productionAccuracy: number | null
  translationAccuracy: number | null
  dailyAvg: number | null
}

export interface SessionAccuracyEntry {
  date: string
  accuracy: number
  needsAttention: boolean
}

export interface VocabDayStats {
  date: string
  cardsReviewed: number
}

export interface VocabActivityStats {
  cardsPerDayAvg: number
  weeklyAccuracyAvg: number
  dueForReview: number
  dailyCardCounts: VocabDayStats[]
}

export interface SessionActivityStats {
  sevenDayAvg: number
  lowest: number
  highest: number
  sessions: SessionAccuracyEntry[]
}

export interface VocabCounts {
  all: number
  new: number
  learning: number
  review: number
  relearning: number
  dueForReview: number
}

export interface StudentProgressResponse {
  weekStart: string
  weekEnd: string
  days: DayActivity[]
  vocab: VocabActivityStats
  production: SessionActivityStats
  translation: SessionActivityStats
  vocabCounts: VocabCounts
}
