/**
 * Contract for GET /api/dashboard — the single endpoint behind the home page.
 * Each interface below maps 1:1 to a card on the dashboard.
 */

export type PracticeStatus = 'not_started' | 'in_progress' | 'complete'

/** One row in the student switcher dropdown. */
export interface RosterStudent {
  uid: string
  name: string
  email: string
  lastActiveAt: string | null
}

/** Header card: name, contact, linked date, activity, vocab size. */
export interface DashboardStudent {
  uid: string
  name: string
  email: string
  linkedAt: string | null
  lastActiveAt: string | null
  vocabTotal: number
}

export interface VocabPracticeToday {
  status: PracticeStatus
  reviewedCount: number
  /** Cards currently due — the remaining share of today's queue. */
  dueCount: number
}

export interface ModePracticeToday {
  status: PracticeStatus
  completedCount: number
  totalCount: number
  scorePercent: number | null
}

/** "Today's Practice" card. */
export interface TodaysPractice {
  vocab: VocabPracticeToday
  production: ModePracticeToday
  translation: ModePracticeToday
}

/** "Vocabulary Health" card. */
export interface VocabHealth {
  new: number
  learning: number
  review: number
  relearning: number
  total: number
}

/** The four stat tiles. */
export interface DashboardStats {
  /** Estimated minutes between first and last activity today (0 when inactive). */
  timeSpentTodayMinutes: number
  wordsReviewedToday: number
  currentStreakDays: number
  wordsDueNow: number
}

export interface VocabTrendPoint {
  /** Local calendar day, YYYY-MM-DD */
  date: string
  /** Short display label ("Mon" for week ranges, "Aug 3" for month) */
  label: string
  cards: number
}

export interface AccuracyTrendPoint {
  date: string
  label: string
  score: number
}

export interface TrendSeries {
  vocabPerDay: VocabTrendPoint[]
  production: AccuracyTrendPoint[]
  translation: AccuracyTrendPoint[]
}

export type TrendsRange = 'this_week' | 'last_week' | 'last_month'

/** "Weekly Trends" card — all ranges shipped at once so the toggle is instant. */
export type DashboardTrends = Record<TrendsRange, TrendSeries>

/** Everything the dashboard shows for one student. */
export interface StudentDashboard {
  student: DashboardStudent
  todaysPractice: TodaysPractice
  vocabHealth: VocabHealth
  stats: DashboardStats
  trends: DashboardTrends
}

export interface DashboardResponse {
  /** Present only when the request did not pin a student (initial page load). */
  roster?: RosterStudent[]
  /** Null when the tutor has no students yet. */
  dashboard: StudentDashboard | null
}
