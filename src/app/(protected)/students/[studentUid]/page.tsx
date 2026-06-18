'use client'

import type { Metadata } from 'next'
import {
  BookOpen,
  Languages,
  FileText,
  BarChart2,
  CirclePlus,
  Users,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react'
import { useStudentOverview } from './student-context'

// ---------------------------------------------------------------------------
// Types & helpers
// ---------------------------------------------------------------------------

type PracticeStatus = 'done' | 'in_progress' | 'not_started'

function mapStatus(s: string): PracticeStatus {
  if (s === 'complete') return 'done'
  if (s === 'in_progress') return 'in_progress'
  return 'not_started'
}

type ActivityType = 'quiz' | 'vocab' | 'production' | 'words_added'

const MOCK_ACTIVITY: {
  id: string
  type: ActivityType
  title: string
  detail: string
  timestamp: string
  score: number | null
}[] = [
  { id: '1', type: 'quiz',       title: 'Translation Quiz',      detail: '88% Accuracy',        timestamp: '2h ago',   score: 88 },
  { id: '2', type: 'vocab',      title: 'Vocabulary Practice',   detail: '15 cards reviewed',   timestamp: '4h ago',   score: null },
  { id: '3', type: 'production', title: 'Production Practice',   detail: '71% Accuracy',        timestamp: 'Yesterday', score: 71 },
  { id: '4', type: 'words_added', title: 'Words Added',          detail: '12 new words imported', timestamp: 'Yesterday', score: null },
  { id: '5', type: 'production', title: 'Production Practice',   detail: '54% Accuracy',        timestamp: '3d ago',   score: 54 },
]

const VOCAB_HEALTH_CONFIG = [
  { key: 'new',        label: 'NEW',        color: '#5B9BD5' },
  { key: 'learning',   label: 'LEARNING',   color: '#1dae75' },
  { key: 'review',     label: 'REVIEW',     color: '#8DCEF9' },
  { key: 'relearning', label: 'RELEARNING', color: '#E24B4A' },
] as const

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ActivityIcon({ type }: { type: ActivityType }) {
  const cls = 'h-4 w-4'
  if (type === 'quiz') return <BarChart2 className={cls} />
  if (type === 'vocab') return <BookOpen className={cls} />
  if (type === 'production') return <Users className={cls} />
  return <CirclePlus className={cls} />
}

function PracticeCard({
  label,
  status,
  headline,
  subline,
  icon,
}: {
  label: string
  status: PracticeStatus
  headline: string
  subline: string
  icon: React.ReactNode
}) {
  const done = status === 'done'
  return (
    <div
      className={[
        'relative flex flex-col gap-1 overflow-hidden rounded-lg border bg-card p-5',
        done ? 'border-[rgba(29,174,117,0.35)]' : 'border-border',
      ].join(' ')}
    >
      {done && (
        <div className="absolute left-0 top-0 h-full w-[3px] rounded-l-lg bg-[#1dae75]" />
      )}
      <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <div className="mt-1 flex items-center gap-2">
        {done ? <CheckCircle2 className="h-5 w-5 shrink-0 text-[#1dae75]" /> : null}
        <span
          className={[
            'text-xl font-semibold font-heading',
            done ? 'text-foreground' : 'text-muted-foreground',
          ].join(' ')}
        >
          {headline}
        </span>
      </div>
      <span className="text-sm text-muted-foreground">{subline}</span>
      <div
        className={[
          'absolute right-4 top-4',
          done ? 'text-[#1dae75]/60' : 'text-muted-foreground/30',
        ].join(' ')}
      >
        {icon}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Overview page
// ---------------------------------------------------------------------------

export default function OverviewPage() {
  const { overview } = useStudentOverview()

  const vocabHealth = overview?.vocabHealth
  const healthTotal = vocabHealth?.total ?? 1

  function buildPracticeCards() {
    if (!overview?.today) return []
    const { vocab, production, translation } = overview.today
    return [
      {
        id: 'vocab',
        label: 'VOCAB',
        status: mapStatus(vocab.status),
        headline: vocab.status === 'complete'
          ? 'Done'
          : vocab.status === 'in_progress'
            ? `${vocab.reviewedCount} cards reviewed`
            : 'Not started',
        subline: vocab.status === 'complete'
          ? `${vocab.reviewedCount} cards reviewed`
          : vocab.status === 'in_progress'
            ? 'In progress'
            : 'Pending today',
        icon: <BookOpen className="h-5 w-5" />,
      },
      {
        id: 'production',
        label: 'PRODUCTION',
        status: mapStatus(production.status),
        headline: production.status === 'not_started'
          ? 'Not started'
          : `${production.scorePercent ?? 0}% score`,
        subline: production.status === 'not_started'
          ? 'Pending today'
          : `${production.completedCount}/${production.totalCount} questions completed`,
        icon: <Languages className="h-5 w-5" />,
      },
      {
        id: 'translation',
        label: 'TRANSLATION',
        status: mapStatus(translation.status),
        headline: translation.status === 'not_started'
          ? 'Not started'
          : `${translation.scorePercent ?? 0}% score`,
        subline: translation.status === 'not_started'
          ? 'Pending today'
          : `${translation.completedCount}/${translation.totalCount} questions completed`,
        icon: <FileText className="h-5 w-5" />,
      },
    ]
  }

  const practiceCards = buildPracticeCards()

  return (
    <div className="flex flex-col gap-6 p-8">
      {/* Today's Practice */}
      <section className="flex flex-col gap-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Today&apos;s Practice
        </h2>
        <div className="grid grid-cols-3 gap-4">
          {practiceCards.map((p) => (
            <PracticeCard key={p.id} {...p} />
          ))}
        </div>
      </section>

      {/* Bottom two-column layout */}
      <div className="grid grid-cols-[1fr_360px] gap-4">
        {/* Recent Activity */}
        <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-base font-semibold font-heading text-foreground">Recent Activity</h2>
            <button className="text-xs font-medium uppercase tracking-wider text-[#8DCEF9] hover:underline">
              View All
            </button>
          </div>
          <ul className="divide-y divide-border">
            {MOCK_ACTIVITY.map((activity) => (
              <li
                key={activity.id}
                className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-white/[0.025]"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground">
                  <ActivityIcon type={activity.type} />
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="text-sm font-medium text-foreground">{activity.title}</span>
                  <span
                    className={
                      activity.score === null
                        ? 'text-xs text-muted-foreground'
                        : activity.score < 70
                          ? 'text-xs text-[#F09F27]'
                          : 'text-xs text-[#1dae75]'
                    }
                  >
                    {activity.detail}
                  </span>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{activity.timestamp}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Vocab Health */}
        <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-card">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-base font-semibold font-heading text-foreground">Vocabulary Health</h2>
          </div>
          <div className="flex flex-1 flex-col gap-4 px-5 py-5">
            {VOCAB_HEALTH_CONFIG.map(({ key, label, color }) => {
              const count = vocabHealth?.[key] ?? 0
              const pct = healthTotal > 0 ? (count / healthTotal) * 100 : 0
              return (
                <div key={key} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                      {label}
                    </span>
                    <span className="text-sm font-medium text-foreground">{count}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: color }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
          <div className="border-t border-border px-5 py-3.5">
            <button className="flex items-center gap-1 text-sm font-medium text-[#8DCEF9] hover:underline">
              Manage vocabulary
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
