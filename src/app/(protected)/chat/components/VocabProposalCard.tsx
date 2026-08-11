'use client'

import { useState } from 'react'
import { Check, CirclePlus, Loader2, Trash2, X } from 'lucide-react'

import type { VocabProposal } from '@/types/chat'
import type { ProposalStatus } from '../useChat'

/**
 * Confirmation card for AI-proposed vocabulary changes. The word list is
 * editable (edit pairs, drop rows) until the tutor confirms or dismisses.
 */
export function VocabProposalCard({
  proposal,
  status,
  summary,
  studentFirstName,
  onConfirm,
  onDismiss,
}: {
  proposal: VocabProposal
  status: ProposalStatus
  summary?: string
  studentFirstName: string
  onConfirm: (edited: VocabProposal) => void
  onDismiss: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [words, setWords] = useState(proposal.words)
  const isAdd = proposal.kind === 'add'
  const settled = status === 'confirmed' || status === 'dismissed'

  function updateWord(index: number, field: 'spanish' | 'english', value: string) {
    setWords((prev) =>
      prev.map((w, i) => {
        if (i !== index) return w
        return { ...w, [field]: value }
      }),
    )
  }

  function removeRow(index: number) {
    setWords((prev) => prev.filter((_, i) => i !== index))
  }

  function confirm() {
    const cleaned = words.filter((w) => w.spanish.trim() && w.english.trim())
    if (cleaned.length === 0) return
    setEditing(false)
    if (isAdd) {
      onConfirm({ kind: 'add', words: cleaned as Extract<VocabProposal, { kind: 'add' }>['words'] })
    } else {
      onConfirm({ kind: 'remove', words: cleaned as Extract<VocabProposal, { kind: 'remove' }>['words'] })
    }
  }

  let heading = 'Proposed vocabulary removals'
  if (isAdd) {
    heading = 'Proposed vocabulary additions'
  }

  let wordNoun = 'words'
  if (words.length === 1) {
    wordNoun = 'word'
  }

  let confirmLabel = `Remove ${words.length} ${wordNoun}`
  let confirmTone = 'bg-[#e07a6a] text-[#2a0f0a] hover:bg-[#e8968a]'
  let confirmIcon = <Trash2 className="h-3.5 w-3.5" />
  if (isAdd) {
    confirmLabel = `Add ${words.length} ${wordNoun} to ${studentFirstName}'s vocabulary`
    confirmTone = 'bg-[#8DCEF9] text-[#0a1a2a] hover:bg-[#A8DAFC]'
    confirmIcon = <CirclePlus className="h-3.5 w-3.5" />
  }
  if (status === 'working') {
    confirmIcon = <Loader2 className="h-3.5 w-3.5 animate-spin" />
  }

  let editLabel = 'Edit list'
  if (editing) {
    editLabel = 'Done editing'
  }

  // Once the tutor has confirmed or dismissed, the action row is replaced by a
  // one-line outcome.
  let footer = (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={confirm}
        disabled={status === 'working' || words.length === 0}
        className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${confirmTone}`}
      >
        {confirmIcon}
        {confirmLabel}
      </button>
      <button
        type="button"
        onClick={() => setEditing((v) => !v)}
        disabled={status === 'working'}
        className="rounded-xl border border-white/[0.12] px-4 py-2 text-sm font-medium text-[#f0f0f0] transition-colors hover:bg-white/[0.04] disabled:opacity-60"
      >
        {editLabel}
      </button>
      <button
        type="button"
        onClick={onDismiss}
        disabled={status === 'working'}
        className="rounded-xl px-3 py-2 text-sm font-medium text-[#6b6b6b] transition-colors hover:text-[#f0f0f0] disabled:opacity-60"
      >
        Dismiss
      </button>
      {summary && <p className="w-full text-xs text-[#e07a6a]">{summary}</p>}
    </div>
  )

  if (settled) {
    let settledTone = 'text-[#6b6b6b]'
    let settledIcon = <X className="h-4 w-4" />
    let settledText = 'Dismissed'
    if (status === 'confirmed') {
      settledTone = 'text-[#61C796]'
      settledIcon = <Check className="h-4 w-4" />
      settledText = summary ?? 'Applied'
    }
    footer = (
      <p className={`mt-4 flex items-center gap-2 text-sm ${settledTone}`}>
        {settledIcon}
        {settledText}
      </p>
    )
  }

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#161616] p-5">
      <p className="text-sm font-medium text-[#f0f0f0]">{heading}</p>

      <div className="mt-3 overflow-hidden rounded-xl border border-white/[0.06]">
        <div className="grid grid-cols-[1fr_1fr_auto] border-b border-white/[0.06] bg-[#111111] px-4 py-2.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6b6b6b]">Spanish</span>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6b6b6b]">English</span>
          <span className="w-6" />
        </div>
        {words.map((word, index) => {
          // Added words have no id yet; removals carry the real card id.
          let rowKey: string | number = index
          if (!isAdd) {
            rowKey = (word as { cardId: string }).cardId
          }

          let cells = (
            <>
              <span className="text-sm text-[#8DCEF9]">{word.spanish}</span>
              <span className="text-sm text-[#f0f0f0]">{word.english}</span>
            </>
          )
          if (editing && isAdd) {
            cells = (
              <>
                <input
                  value={word.spanish}
                  onChange={(e) => updateWord(index, 'spanish', e.target.value)}
                  className="mr-3 rounded-md border border-white/[0.1] bg-transparent px-2 py-1 text-sm text-[#8DCEF9] outline-none focus:border-[#8DCEF9]/50"
                />
                <input
                  value={word.english}
                  onChange={(e) => updateWord(index, 'english', e.target.value)}
                  className="mr-3 rounded-md border border-white/[0.1] bg-transparent px-2 py-1 text-sm text-[#f0f0f0] outline-none focus:border-[#8DCEF9]/50"
                />
              </>
            )
          }

          let rowAction = <span className="w-6" />
          if (editing) {
            rowAction = (
              <button
                type="button"
                onClick={() => removeRow(index)}
                className="flex h-6 w-6 items-center justify-center rounded text-[#6b6b6b] transition-colors hover:bg-white/[0.06] hover:text-[#e07a6a]"
                aria-label="Remove row"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )
          }

          return (
            <div
              key={rowKey}
              className="grid grid-cols-[1fr_1fr_auto] items-center border-b border-white/[0.04] px-4 py-2.5 last:border-0"
            >
              {cells}
              {rowAction}
            </div>
          )
        })}
      </div>

      {footer}
    </div>
  )
}
