'use client'

import Link from 'next/link'
import { CirclePlus, Settings2 } from 'lucide-react'

export function QuickActions({ studentUid }: { studentUid: string | null }) {
  const vocabHref = studentUid ? `/students/${studentUid}/vocabulary` : '/students'

  return (
    <div className="flex flex-col gap-3">
      <Link
        href="/chat"
        className="flex items-center justify-between rounded-xl bg-[#8DCEF9] px-5 py-4 font-medium text-[#0a1a2a] transition-colors hover:bg-[#A8DAFC]"
      >
        <span className="flex items-center gap-2.5">
          <svg width="16" height="16" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
            <path d="M18 8L16.75 5.25L14 4L16.75 2.75L18 0L19.25 2.75L22 4L19.25 5.25L18 8ZM18 22L16.75 19.25L14 18L16.75 16.75L18 14L19.25 16.75L22 18L19.25 19.25L18 22ZM8 19L5.5 13.5L0 11L5.5 8.5L8 3L10.5 8.5L16 11L10.5 13.5L8 19ZM8 14.15L9 12L11.15 11L9 10L8 7.85L7 10L4.85 11L7 12L8 14.15Z" fill="#0a1a2a"/>
          </svg>
          Ask Verbly
        </span>
        <span aria-hidden>→</span>
      </Link>

      <div className="grid flex-1 grid-cols-2 gap-3">
        <Link
          href={vocabHref}
          className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card text-sm font-medium text-foreground transition-colors hover:bg-[#1e1e1e]"
        >
          <CirclePlus className="h-5 w-5 text-muted-foreground" />
          Add words
        </Link>
        <Link
          href={vocabHref}
          className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 text-center text-sm font-medium text-foreground transition-colors hover:bg-[#1e1e1e]"
        >
          <Settings2 className="h-5 w-5 text-muted-foreground" />
          Manage vocabulary
        </Link>
      </div>
    </div>
  )
}
