'use client'

import { useCallback, useRef, useState } from 'react'

import {
  deleteChat as deleteSavedChat,
  generateTitle,
  loadChat,
  renameChat,
  saveChat,
} from './lib/chatHistoryApi'
import { appendItem, EMPTY_THREAD, makeId, threadTitle } from './lib/thread'
import { useChatHistory } from './useChatHistory'
import type { ThreadHandle } from './useThread'

const LOAD_FAILED = 'Could not load that conversation. Please try again.'

/**
 * The saved side of a conversation: the sidebar list, which thread is open, and
 * the writes that keep them in step.
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
  const { history, refresh, upsert, rename, remove } = useChatHistory()
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const [isLoadingChat, setIsLoadingChat] = useState(false)
  /** Bumped by every thread switch so a slow load cannot land on a newer thread. */
  const loadTokenRef = useRef(0)
  const writeQueueRef = useRef<Promise<unknown>>(Promise.resolve())

  /**
   * Serialises writes. A turn now saves twice — once on send, once when the
   * answer lands — and the title may be written in between, so they must reach
   * Firestore in the order they were issued.
   */
  const enqueue = useCallback(<T,>(task: () => Promise<T>): Promise<T> => {
    const result = writeQueueRef.current.then(task, task)
    writeQueueRef.current = result.then(
      () => undefined,
      () => undefined,
    )
    return result
  }, [])

  /** Writes the thread back whole; the first save mints the chat id. */
  const persist = useCallback(
    () =>
      enqueue(async () => {
        const { items, interactionId, title } = thread.ref.current
        if (!studentUid || items.length === 0) return

        const chatId = thread.ref.current.chatId ?? crypto.randomUUID()
        if (!thread.ref.current.chatId) thread.apply((prev) => ({ ...prev, chatId }))

        const saved = await saveChat(chatId, {
          studentUid,
          studentName,
          title: title ?? threadTitle(items),
          items,
          interactionId,
        })
        // A failed save leaves the thread on screen; the next turn retries it.
        if (!saved) return
        setActiveChatId(saved.id)
        upsert(saved)
      }),
    [enqueue, studentUid, studentName, thread, upsert],
  )

  /**
   * Replaces a new thread's provisional label (the tutor's raw message) with a
   * short generated one. Fired alongside the answer, so it lands seconds before
   * the turn finishes.
   */
  const nameThread = useCallback(
    (message: string) => {
      if (thread.ref.current.title) return
      const token = loadTokenRef.current

      void generateTitle(message).then((title) => {
        // The tutor may have switched threads while the model was naming this one.
        if (!title || loadTokenRef.current !== token) return
        const { chatId } = thread.ref.current
        if (!chatId) return

        thread.apply((prev) => ({ ...prev, title }))
        rename(chatId, title)
        void enqueue(() => renameChat(chatId, title))
      })
    },
    [thread, rename, enqueue],
  )

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
      // Already open (or already loading) — re-fetching would only throw away
      // the thread on screen and flash a spinner in its place.
      if (thread.ref.current.chatId === chatId) return

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
          title: chat.title,
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

  const renameSavedChat = useCallback(
    async (chatId: string, title: string) => {
      const next = title.trim()
      if (!next) return

      rename(chatId, next)
      if (thread.ref.current.chatId === chatId) {
        thread.apply((prev) => ({ ...prev, title: next }))
      }
      try {
        await enqueue(() => renameChat(chatId, next))
      } catch {
        // Put the old label back if the rename did not land.
        refresh()
      }
    },
    [rename, thread, enqueue, refresh],
  )

  const deleteChat = useCallback(
    async (chatId: string) => {
      remove(chatId)
      if (thread.ref.current.chatId === chatId) startNewChat()
      try {
        await enqueue(() => deleteSavedChat(chatId))
      } catch {
        // Put the row back if the delete did not land.
        refresh()
      }
    },
    [remove, thread, startNewChat, enqueue, refresh],
  )

  return {
    history,
    activeChatId,
    isLoadingChat,
    persist,
    nameThread,
    startNewChat,
    openChat,
    renameChat: renameSavedChat,
    deleteChat,
  }
}
