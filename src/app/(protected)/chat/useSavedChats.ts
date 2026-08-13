'use client'

import { useCallback, useRef, useState } from 'react'

import { deleteChat as deleteSavedChat, loadChat, saveChat } from './lib/chatHistoryApi'
import { appendItem, EMPTY_THREAD, makeId, threadTitle } from './lib/thread'
import { useChatHistory } from './useChatHistory'
import type { ThreadHandle } from './useThread'

const LOAD_FAILED = 'Could not load that conversation. Please try again.'

/**
 * The saved side of a conversation: the sidebar list, which thread is open, and
 * the write-back after each turn.
 *
 * Switching threads has to cancel whatever is still streaming into the old one,
 * which is why this takes `abort` from the turn loop.
 */
export function useSavedChats({
  studentUid,
  studentName,
  thread,
  abort,
}: {
  studentUid: string | null
  studentName: string
  thread: ThreadHandle
  abort: () => void
}) {
  const { history, refresh, upsert, remove } = useChatHistory()
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const [isLoadingChat, setIsLoadingChat] = useState(false)
  /** Bumped by every thread switch so a slow load cannot land on a newer thread. */
  const loadTokenRef = useRef(0)

  /** Writes the thread back whole; the first save mints the chat id. */
  const persist = useCallback(async () => {
    const { items, interactionId } = thread.ref.current
    if (!studentUid || items.length === 0) return

    const chatId = thread.ref.current.chatId ?? crypto.randomUUID()
    if (!thread.ref.current.chatId) thread.apply((prev) => ({ ...prev, chatId }))

    const saved = await saveChat(chatId, {
      studentUid,
      studentName,
      title: threadTitle(items),
      items,
      interactionId,
    })
    // A failed save leaves the thread on screen; the next turn retries it.
    if (!saved) return
    setActiveChatId(saved.id)
    upsert(saved)
  }, [studentUid, studentName, thread, upsert])

  /** Clears the thread and detaches from any saved chat. */
  const startNewChat = useCallback(() => {
    loadTokenRef.current += 1
    abort()
    thread.replace(EMPTY_THREAD)
    setActiveChatId(null)
    setIsLoadingChat(false)
  }, [abort, thread])

  /** Loads a saved thread, replacing whatever is on screen. */
  const openChat = useCallback(
    async (chatId: string) => {
      const token = ++loadTokenRef.current
      abort()
      thread.replace({ ...EMPTY_THREAD, chatId })
      setActiveChatId(chatId)
      setIsLoadingChat(true)

      try {
        const chat = await loadChat(chatId)
        if (loadTokenRef.current !== token) return
        thread.replace({
          chatId,
          items: chat.items,
          interactionId: chat.interactionId,
          streamingItemId: null,
        })
      } catch {
        if (loadTokenRef.current !== token) return
        // Detach from the saved chat so the message below can never be written
        // back over the thread we failed to read.
        thread.replace(EMPTY_THREAD)
        setActiveChatId(null)
        thread.apply((prev) =>
          appendItem(prev, { id: makeId(), kind: 'assistant', text: LOAD_FAILED }),
        )
      } finally {
        if (loadTokenRef.current === token) setIsLoadingChat(false)
      }
    },
    [abort, thread],
  )

  const deleteChat = useCallback(
    async (chatId: string) => {
      remove(chatId)
      if (thread.ref.current.chatId === chatId) startNewChat()
      try {
        await deleteSavedChat(chatId)
      } catch {
        // Put the row back if the delete did not land.
        refresh()
      }
    },
    [remove, thread, startNewChat, refresh],
  )

  return { history, activeChatId, isLoadingChat, persist, startNewChat, openChat, deleteChat }
}
