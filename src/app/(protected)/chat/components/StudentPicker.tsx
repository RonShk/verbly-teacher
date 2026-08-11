'use client'

import { Check, ChevronDown } from 'lucide-react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export interface RosterStudent {
  uid: string
  name: string
  email: string
}

export function StudentPicker({
  students,
  selectedUid,
  onSelect,
  disabled,
}: {
  students: RosterStudent[]
  selectedUid: string | null
  onSelect: (uid: string) => void
  disabled: boolean
}) {
  const selected = students.find((s) => s.uid === selectedUid) ?? null

  let triggerLabel = 'Select a student'
  if (selected) {
    triggerLabel = selected.name
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-[#161616] px-3.5 py-1.5 text-sm transition-colors hover:bg-[#1e1e1e] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="h-2 w-2 rounded-full bg-[#61C796]" />
          <span className="font-medium text-[#f0f0f0]">
            {triggerLabel}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-[#6b6b6b]" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="min-w-[220px]">
        {students.map((student) => (
          <DropdownMenuItem
            key={student.uid}
            onSelect={() => onSelect(student.uid)}
            className="flex items-center justify-between gap-3"
          >
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm">{student.name}</span>
              <span className="truncate text-xs text-muted-foreground">{student.email}</span>
            </div>
            {student.uid === selectedUid && <Check className="h-3.5 w-3.5 shrink-0" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
