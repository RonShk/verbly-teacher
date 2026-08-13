'use client'

import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { MoreVertical, Pencil, Trash2 } from 'lucide-react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { ChatSummary } from '@/types/chat'

/** "Today" / "Yesterday" / "3 Mar" — enough to place a chat at a glance. */
function formatWhen(updatedAt: string | null): string {
  if (!updatedAt) return ''
  const date = new Date(updatedAt)
  if (Number.isNaN(date.getTime())) return ''

  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const daysAgo = Math.floor((startOfToday.getTime() - date.getTime()) / 86_400_000) + 1

  if (daysAgo <= 0) return 'Today'
  if (daysAgo === 1) return 'Yesterday'
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

export function ChatHistoryRow({
  chat,
  isActive,
  disabled,
  onSelect,
  onRename,
  onDelete,
}: {
  chat: ChatSummary
  isActive: boolean
  disabled: boolean
  onSelect: () => void
  onRename: (title: string) => void
  onDelete: () => void
}) {
  const [renaming, setRenaming] = useState(false)
  const [draft, setDraft] = useState(chat.title)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!renaming) return
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [renaming])

  function commit() {
    if (!renaming) return
    setRenaming(false)
    const next = draft.trim()
    if (next && next !== chat.title) onRename(next)
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      commit()
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      setRenaming(false)
    }
  }

  if (renaming) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={commit}
        aria-label="Chat name"
        className="w-full rounded-lg border border-[#8DCEF9]/50 bg-[#161616] px-3 py-2 text-sm text-[#f0f0f0] outline-none"
      />
    )
  }

  let rowTone = 'text-[#a0a0a0] hover:bg-white/[0.04] hover:text-[#f0f0f0]'
  if (isActive) {
    rowTone = 'bg-white/[0.06] text-[#f0f0f0]'
  }

  const when = formatWhen(chat.updatedAt)
  let meta = chat.studentName
  if (when) {
    meta = `${chat.studentName} · ${when}`
  }

  return (
    <div className="group/row relative">
      <button
        type="button"
        onClick={onSelect}
        disabled={disabled}
        className={`w-full cursor-pointer rounded-lg px-3 py-2 pr-9 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${rowTone}`}
      >
        <span className="block truncate text-sm">{chat.title}</span>
        <span className="mt-0.5 block truncate text-xs text-[#6b6b6b]">{meta}</span>
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            aria-label={`Options for "${chat.title}"`}
            /* Hidden until this row is hovered — but stays put while its own menu
               is open (data-state), and for keyboard users (focus-visible). */
            className="absolute right-1.5 top-1.5 flex h-6 w-6 cursor-pointer items-center justify-center rounded text-[#6b6b6b] opacity-0 transition hover:bg-white/[0.08] hover:text-[#f0f0f0] focus-visible:opacity-100 disabled:cursor-not-allowed group-hover/row:opacity-100 data-[state=open]:opacity-100"
          >
            <MoreVertical className="h-3.5 w-3.5" />
          </button>
        </DropdownMenuTrigger>
        {/* Focus goes to the rename field, not back to this trigger. */}
        <DropdownMenuContent
          align="end"
          className="w-40"
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <DropdownMenuItem
            onSelect={() => {
              setDraft(chat.title)
              setRenaming(true)
            }}
          >
            <Pencil />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onSelect={onDelete}>
            <Trash2 />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
