'use client'

import { Clock, Flame, ListChecks, Timer } from 'lucide-react'

import type { DashboardStats } from '@/types/dashboard'

function formatTimeSpent(minutes: number): { value: string; unit: string } {
  if (minutes < 60) return { value: String(minutes), unit: 'm' }
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return { value: `${hours}:${String(rest).padStart(2, '0')}`, unit: 'h' }
}

function StatTile({
  label,
  icon,
  value,
  unit,
  valueColor,
}: {
  label: string
  icon: React.ReactNode
  value: string
  unit?: string
  valueColor?: string
}) {
  return (
    <div className="flex flex-col justify-between rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">{label}</span>
        <span className="text-muted-foreground/50">{icon}</span>
      </div>
      <div className="mt-3 flex items-baseline gap-1">
        <span className="font-heading text-4xl font-bold" style={{ color: valueColor ?? 'var(--foreground)' }}>
          {value}
        </span>
        {unit && <span className="text-sm font-medium text-muted-foreground">{unit}</span>}
      </div>
    </div>
  )
}

export function StatTiles({ stats }: { stats: DashboardStats | null }) {
  const timeSpent = stats ? formatTimeSpent(stats.timeSpentTodayMinutes) : null

  return (
    <div className="grid grid-cols-2 gap-5">
      <StatTile
        label="Time Spent"
        icon={<Timer className="h-4 w-4" />}
        value={timeSpent?.value ?? '—'}
        unit={timeSpent?.unit}
      />
      <StatTile
        label="Words Reviewed"
        icon={<ListChecks className="h-4 w-4" />}
        value={stats ? String(stats.wordsReviewedToday) : '—'}
      />
      <StatTile
        label="Current Streak"
        icon={<Flame className="h-4 w-4" />}
        value={stats ? String(stats.currentStreakDays) : '—'}
        unit={stats?.currentStreakDays === 1 ? 'day' : 'days'}
      />
      <StatTile
        label="Words Due"
        icon={<Clock className="h-4 w-4" />}
        value={stats ? String(stats.wordsDueNow) : '—'}
        valueColor="#8DCEF9"
      />
    </div>
  )
}
