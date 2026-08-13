'use client'

import { Loader2, MessageSquare, SquarePen, Trash2 } from 'lucide-react'

import type { ChatSummary } from '@/types/chat'

/** "today" / "yesterday" / "3 Mar" — enough to place a chat at a glance. */
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

export function ChatHistorySidebar({
  history,
  activeChatId,
  disabled,
  onNewChat,
  onSelect,
  onDelete,
}: {
  /** null while the list is still loading. */
  history: ChatSummary[] | null
  activeChatId: string | null
  /** Switching threads mid-answer would orphan the stream, so it waits. */
  disabled: boolean
  onNewChat: () => void
  onSelect: (chat: ChatSummary) => void
  onDelete: (chatId: string) => void
}) {
  let list = (
    <p className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-[#6b6b6b]">
      <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
      Loading…
    </p>
  )

  if (history !== null && history.length === 0) {
    list = (
      <p className="flex items-start gap-2.5 px-3 py-2.5 text-sm text-[#6b6b6b]">
        <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>Your chats will show up here.</span>
      </p>
    )
  }

  if (history !== null && history.length > 0) {
    list = (
      <div className="flex flex-col gap-0.5">
        {history.map((chat) => {
          let rowTone = 'text-[#a0a0a0] hover:bg-white/[0.04] hover:text-[#f0f0f0]'
          if (chat.id === activeChatId) {
            rowTone = 'bg-white/[0.06] text-[#f0f0f0]'
          }

          const when = formatWhen(chat.updatedAt)
          let meta = chat.studentName
          if (when) {
            meta = `${chat.studentName} · ${when}`
          }

          return (
            <div key={chat.id} className="group/row relative">
              <button
                type="button"
                onClick={() => onSelect(chat)}
                disabled={disabled}
                className={`w-full cursor-pointer rounded-lg px-3 py-2 pr-8 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${rowTone}`}
              >
                <span className="block truncate text-sm">{chat.title}</span>
                <span className="mt-0.5 block truncate text-xs text-[#6b6b6b]">{meta}</span>
              </button>
              <button
                type="button"
                onClick={() => onDelete(chat.id)}
                disabled={disabled}
                aria-label={`Delete chat "${chat.title}"`}
                className="absolute right-1.5 top-1.5 hidden h-6 w-6 cursor-pointer items-center justify-center rounded text-[#6b6b6b] transition-colors hover:bg-white/[0.08] hover:text-[#e07a6a] disabled:cursor-not-allowed group-hover/row:flex"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <aside className="flex w-[240px] shrink-0 flex-col border-r border-white/[0.06] bg-[#0a0a0a]">
      <div className="shrink-0 px-3 pt-4">
        <button
          type="button"
          onClick={onNewChat}
          disabled={disabled}
          className="flex w-full cursor-pointer items-center gap-2 rounded-lg border border-white/[0.08] bg-[#161616] px-3 py-2 text-sm font-medium text-[#f0f0f0] transition-colors hover:bg-[#1e1e1e] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <SquarePen className="h-3.5 w-3.5 shrink-0" />
          New chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <p className="mb-3 px-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#6b6b6b]">
          History
        </p>
        {list}
      </div>
    </aside>
  )
}
