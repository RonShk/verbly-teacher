'use client'

import { Check, ChevronDown, Link2, Mail, UserPlus } from 'lucide-react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { DashboardStudent, RosterStudent } from '@/types/dashboard'

function formatLinkedDate(iso: string | null): string {
  if (!iso) return 'Unknown'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatLastActive(iso: string | null): string {
  if (!iso) return 'Never active'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'Active just now'
  if (mins < 60) return `Last active ${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `Last active ${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days === 1) return 'Last active yesterday'
  return `Last active ${days}d ago`
}

function isRecentlyActive(iso: string | null): boolean {
  if (!iso) return false
  return Date.now() - new Date(iso).getTime() < 48 * 60 * 60 * 1000
}

export function StudentHeader({
  roster,
  selectedUid,
  student,
  onSelectStudent,
  onAddStudent,
}: {
  roster: RosterStudent[] | null
  selectedUid: string | null
  student: DashboardStudent | null
  onSelectStudent: (uid: string) => void
  onAddStudent: () => void
}) {
  const selectedName =
    roster?.find((s) => s.uid === selectedUid)?.name ?? (roster === null ? 'Loading…' : '—')

  return (
    <div className="flex flex-wrap items-center justify-between gap-6 border-b border-border pb-6">
      <div className="flex flex-col gap-1.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="group flex w-fit items-center gap-2 outline-none">
              <h1 className="font-heading text-3xl font-bold text-foreground">{selectedName}</h1>
              <ChevronDown className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-64">
            {(roster ?? []).map((s) => (
              <DropdownMenuItem
                key={s.uid}
                onSelect={() => onSelectStudent(s.uid)}
                className="flex items-center justify-between"
              >
                <span className="truncate">{s.name}</span>
                {s.uid === selectedUid && <Check className="h-4 w-4 text-[#8DCEF9]" />}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onAddStudent}>
              <UserPlus className="h-4 w-4" />
              Add student
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {student?.email && (
            <span className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" />
              {student.email}
            </span>
          )}
          {student?.linkedAt && (
            <span className="flex items-center gap-1.5">
              <Link2 className="h-3.5 w-3.5" />
              Linked {formatLinkedDate(student.linkedAt)}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex flex-col items-end gap-1">
          <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            Active Vocabulary
          </span>
          <span className="flex items-baseline gap-1.5">
            <span className="font-heading text-2xl font-bold text-[#8DCEF9]">
              {student?.vocabTotal ?? '—'}
            </span>
            <span className="text-sm text-muted-foreground">words</span>
          </span>
        </div>
        <div className="h-10 w-px bg-border" />
        <div className="flex flex-col items-end gap-1">
          <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            Status
          </span>
          <span className="flex items-center gap-2 text-sm text-foreground">
            <span
              className={`h-2 w-2 rounded-full ${
                isRecentlyActive(student?.lastActiveAt ?? null) ? 'bg-[#1dae75]' : 'bg-muted-foreground/40'
              }`}
            />
            {student ? formatLastActive(student.lastActiveAt) : '—'}
          </span>
        </div>
      </div>
    </div>
  )
}
