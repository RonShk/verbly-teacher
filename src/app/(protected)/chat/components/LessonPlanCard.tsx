'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Download, FileText } from 'lucide-react'

import type { LessonPlanFile } from '@/types/chat'
import { Markdown } from '../markdown'

/** Lesson plan delivered by the AI: download as a .md file, expandable preview. */
export function LessonPlanCard({ plan }: { plan: LessonPlanFile }) {
  const [expanded, setExpanded] = useState(false)

  function download() {
    const blob = new Blob([plan.markdown], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = plan.filename
    anchor.click()
    URL.revokeObjectURL(url)
  }

  let previewIcon = <ChevronDown className="h-3.5 w-3.5" />
  let previewLabel = 'Preview'
  if (expanded) {
    previewIcon = <ChevronUp className="h-3.5 w-3.5" />
    previewLabel = 'Hide preview'
  }

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#161616] p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[rgba(141,206,249,0.12)]">
          <FileText className="h-4 w-4 text-[#8DCEF9]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-[#f0f0f0]">{plan.title}</p>
          <p className="truncate text-xs text-[#6b6b6b]">{plan.filename}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={download}
          className="flex items-center gap-2 rounded-xl bg-[#8DCEF9] px-4 py-2 text-sm font-medium text-[#0a1a2a] transition-colors hover:bg-[#A8DAFC]"
        >
          <Download className="h-3.5 w-3.5" />
          Download lesson plan
        </button>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1.5 rounded-xl border border-white/[0.12] px-4 py-2 text-sm font-medium text-[#f0f0f0] transition-colors hover:bg-white/[0.04]"
        >
          {previewIcon}
          {previewLabel}
        </button>
      </div>

      {expanded && (
        <div className="mt-4 max-h-96 overflow-y-auto rounded-xl border border-white/[0.06] bg-[#111111] p-4">
          <Markdown text={plan.markdown} />
        </div>
      )}
    </div>
  )
}
