'use client'

import { Info } from 'lucide-react'

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { VocabHealth } from '@/types/dashboard'

const ROWS = [
  { key: 'review',     label: 'Review',     color: '#8DCEF9' },
  { key: 'learning',   label: 'Learning',   color: '#5B9BD5' },
  { key: 'new',        label: 'New',        color: '#6b6b6b' },
  { key: 'relearning', label: 'Relearning', color: '#f09595' },
] as const

export function VocabHealthCard({ health }: { health: VocabHealth | null }) {
  const total = health?.total ?? 0

  return (
    <div className="flex flex-col rounded-xl border border-border bg-card p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-semibold text-foreground">Vocabulary Health</h2>
        <Tooltip>
          <TooltipTrigger asChild>
            <button aria-label="About vocabulary states" className="text-muted-foreground/60 transition-colors hover:text-foreground">
              <Info className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-56">
            How words are distributed across spaced-repetition states, from newly added to fully reviewed.
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="mt-6 flex flex-1 flex-col justify-between gap-4">
        {ROWS.map(({ key, label, color }) => {
          const count = health?.[key] ?? 0
          const pct = total > 0 ? (count / total) * 100 : 0
          const highlight = key === 'relearning' && count > 0
          return (
            <div key={key} className="grid grid-cols-[86px_1fr_48px] items-center gap-4">
              <span className="text-sm text-muted-foreground">{label}</span>
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: color }}
                />
              </div>
              <span
                className="text-right text-sm font-semibold"
                style={{ color: highlight ? '#f09595' : 'var(--foreground)' }}
              >
                {health ? count : '—'}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
