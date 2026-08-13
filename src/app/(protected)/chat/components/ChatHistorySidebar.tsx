'use client'

import { Loader2, MessageSquare, SquarePen } from 'lucide-react'

import type { ChatSummary } from '@/types/chat'
import { ChatHistoryRow } from './ChatHistoryRow'

export function ChatHistorySidebar({
  history,
  activeChatId,
  disabled,
  onNewChat,
  onSelect,
  onRename,
  onDelete,
}: {
  /** null while the list is still loading. */
  history: ChatSummary[] | null
  activeChatId: string | null
  /** Switching threads mid-answer would orphan the stream, so it waits. */
  disabled: boolean
  onNewChat: () => void
  onSelect: (chat: ChatSummary) => void
  onRename: (chatId: string, title: string) => void
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
        {history.map((chat) => (
          <ChatHistoryRow
            key={chat.id}
            chat={chat}
            isActive={chat.id === activeChatId}
            disabled={disabled}
            onSelect={() => onSelect(chat)}
            onRename={(title) => onRename(chat.id, title)}
            onDelete={() => onDelete(chat.id)}
          />
        ))}
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
