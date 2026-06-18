export type RecentActivityType = 'vocab' | 'production' | 'translation' | 'words_added'

export interface RecentActivityItem {
  id: string
  studentUid: string
  studentName: string
  type: RecentActivityType
  title: string
  detail: string
  occurredAt: string
  scorePercent: number | null
  cardsReviewed: number | null
}

export interface FetchRecentActivityParams {
  tutorUid: string
  /** When set, only this student's activity. When omitted, all roster students. */
  studentUid?: string
  /** Max items returned after merging and sorting. Default 10. */
  limit?: number
  /** Client timezone offset in minutes (same as overview API). Default 0. */
  timezoneOffsetMinutes?: number
}
