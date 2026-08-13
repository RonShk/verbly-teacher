'use client'

import { useCallback, useEffect, useState } from 'react'

import type { ChatSummary } from '@/types/chat'
import { listChats } from './lib/chatHistoryApi'

/**
 * The sidebar list, deliberately kept apart from the open thread: saving a turn
 * or deleting a row nudges this list without touching the conversation itself.
 */
export function useChatHistory() {
  /** null while the first read is in flight. */
  const [history, setHistory] = useState<ChatSummary[] | null>(null)

  useEffect(() => {
    // An unreadable list still resolves to empty, so the sidebar stops loading.
    void listChats().then((chats) => setHistory(chats ?? []))
  }, [])

  const refresh = useCallback(() => {
    // A failed read leaves whatever the sidebar already shows.
    void listChats().then((chats) => {
      if (chats) setHistory(chats)
    })
  }, [])

  /** A save moves the thread to the top of the list, replacing its old row. */
  const upsert = useCallback((chat: ChatSummary) => {
    setHistory((prev) => [chat, ...(prev ?? []).filter((c) => c.id !== chat.id)])
  }, [])

  /** Retitles a row in place — a rename must not reorder the list. */
  const rename = useCallback((chatId: string, title: string) => {
    setHistory((prev) =>
      (prev ?? []).map((c) => {
        if (c.id !== chatId) return c
        return { ...c, title }
      }),
    )
  }, [])

  const remove = useCallback((chatId: string) => {
    setHistory((prev) => (prev ?? []).filter((c) => c.id !== chatId))
  }, [])

  return { history, refresh, upsert, rename, remove }
}
