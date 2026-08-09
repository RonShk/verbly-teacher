'use client'

import { CheckCircle2 } from 'lucide-react'

import type { ModePracticeToday, TodaysPractice } from '@/types/dashboard'

type PracticeColumn = {
  id: string
  label: string
  percent: number
  color: string
  subline: React.ReactNode
}

function overallBadge(practice: TodaysPractice): { label: string; className: string } {
  const statuses = [practice.vocab.status, practice.production.status, practice.translation.status]
  if (statuses.every((s) => s === 'complete')) {
    return { label: 'Complete', className: 'bg-[rgba(29,174,117,0.12)] text-[#1dae75]' }
  }
  if (statuses.some((s) => s !== 'not_started')) {
    return { label: 'In progress', className: 'bg-[#1e1e1e] text-muted-foreground' }
  }
  return { label: 'Not started', className: 'bg-[#1e1e1e] text-muted-foreground/70' }
}

function modeColumn(id: string, label: string, mode: ModePracticeToday): PracticeColumn {
  const percent = mode.totalCount > 0 ? Math.round((mode.completedCount / mode.totalCount) * 100) : 0
  const complete = mode.status === 'complete'
  const mastered = complete && (mode.scorePercent ?? 0) >= 90
  return {
    id,
    label,
    percent,
    color: complete ? '#1dae75' : '#8DCEF9',
    subline: mastered ? (
      <span className="flex items-center gap-1 text-[#1dae75]">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Mastered
      </span>
    ) : mode.status === 'not_started' ? (
      'Not started'
    ) : mode.scorePercent != null ? (
      `Accuracy: ${mode.scorePercent}%`
    ) : (
      `${mode.completedCount}/${mode.totalCount} completed`
    ),
  }
}

function buildColumns(practice: TodaysPractice): PracticeColumn[] {
  const { vocab } = practice
  const vocabTotal = vocab.reviewedCount + vocab.dueCount
  const vocabPercent = vocabTotal === 0 ? 100 : Math.round((vocab.reviewedCount / vocabTotal) * 100)

  return [
    {
      id: 'vocab',
      label: 'Vocabulary',
      percent: vocabPercent,
      color: '#8DCEF9',
      subline: vocabTotal === 0 ? 'All caught up' : `${vocab.reviewedCount}/${vocabTotal} completed`,
    },
    modeColumn('production', 'Production', practice.production),
    modeColumn('translation', 'Translation', practice.translation),
  ]
}

export function TodaysPracticeCard({ practice }: { practice: TodaysPractice | null }) {
  const badge = practice ? overallBadge(practice) : null
  const columns = practice ? buildColumns(practice) : []

  return (
    <div className="flex flex-col rounded-xl border border-border bg-card p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-semibold text-foreground">Today&apos;s Practice</h2>
        {badge && (
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest ${badge.className}`}>
            {badge.label}
          </span>
        )}
      </div>

      <div className="mt-6 grid flex-1 grid-cols-3 gap-8">
        {practice ? (
          columns.map((col) => (
            <div key={col.id} className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">{col.label}</span>
                <span className="text-sm font-semibold" style={{ color: col.color }}>
                  {col.percent}%
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${col.percent}%`, backgroundColor: col.color }}
                />
              </div>
              <span className="text-sm text-muted-foreground">{col.subline}</span>
            </div>
          ))
        ) : (
          <div className="col-span-3 py-6 text-center text-sm text-muted-foreground">Loading…</div>
        )}
      </div>
    </div>
  )
}
