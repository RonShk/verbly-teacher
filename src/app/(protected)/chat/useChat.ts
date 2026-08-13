'use client'

import { useCallback, useRef, useState } from 'react'

import { clientAuth } from '@/lib/firebase/client'
import type { VocabProposal } from '@/types/chat'

import { applyVocabProposal } from './lib/applyVocabProposal'
import { streamChatTurn } from './lib/chatStream'
import { applyStreamEvent, appendItem, makeId, patchItem } from './lib/thread'
import { useSavedChats } from './useSavedChats'
import { useThread } from './useThread'

const STREAM_FAILED = 'Something went wrong while answering. Please try again.'
const APPLY_FAILED = 'Could not apply the change — please try again.'
const DISMISSED = '[APP EVENT] The tutor dismissed the proposal without applying it.'

/**
 * Drives one conversation, composing the open thread (useThread), its saved
 * form (useSavedChats), and the turn loop below.
 *
 * A thread belongs to the student it was started with, so the caller re-selects
 * that student when it opens one from history.
 */
export function useChat({
  studentUid,
  studentName,
}: {
  studentUid: string | null
  studentName: string
}) {
  const { thread, handle } = useThread()
  const [isStreaming, setIsStreaming] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  /** Cuts the current answer short; the partial reply is kept. */
  const stop = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  const { history, activeChatId, isLoadingChat, persist, startNewChat, openChat, deleteChat } =
    useSavedChats({ studentUid, studentName, thread: handle, abort: stop })

  const send = useCallback(
    async (text: string, options?: { hidden?: boolean }) => {
      const message = text.trim()
      if (!message || !studentUid || !clientAuth.currentUser) return

      setIsStreaming(true)
      handle.apply((prev) => {
        const started = { ...prev, streamingItemId: null }
        if (options?.hidden) return started
        return appendItem(started, { id: makeId(), kind: 'user', text: message })
      })

      const controller = new AbortController()
      abortRef.current = controller

      try {
        await streamChatTurn(
          { studentUid, message, previousInteractionId: handle.ref.current.interactionId },
          controller.signal,
          (event) => handle.apply((prev) => applyStreamEvent(prev, event)),
        )
      } catch {
        // Stopping aborts the fetch, which lands here — that is not an error,
        // and whatever streamed in before the stop stays on screen.
        if (!controller.signal.aborted) {
          handle.apply((prev) =>
            appendItem(prev, { id: makeId(), kind: 'assistant', text: STREAM_FAILED }),
          )
        }
      } finally {
        if (abortRef.current === controller) abortRef.current = null
        handle.apply((prev) => ({ ...prev, streamingItemId: null }))
        setIsStreaming(false)
        void persist()
      }
    },
    [studentUid, handle, persist],
  )

  /** Applies a (possibly edited) proposal through the vocab API, then tells the model. */
  const confirmProposal = useCallback(
    async (itemId: string, proposal: VocabProposal) => {
      if (!studentUid) return
      handle.apply((prev) => patchItem(prev, itemId, { status: 'working', proposal }))

      try {
        const { summary, note } = await applyVocabProposal(studentUid, proposal)
        handle.apply((prev) => patchItem(prev, itemId, { status: 'confirmed', summary }))
        void send(note, { hidden: true })
      } catch {
        handle.apply((prev) => patchItem(prev, itemId, { status: 'pending', summary: APPLY_FAILED }))
      }
    },
    [studentUid, handle, send],
  )

  const dismissProposal = useCallback(
    (itemId: string) => {
      handle.apply((prev) => patchItem(prev, itemId, { status: 'dismissed' }))
      void send(DISMISSED, { hidden: true })
    },
    [handle, send],
  )

  return {
    items: thread.items,
    isStreaming,
    isLoadingChat,
    history,
    activeChatId,
    send,
    stop,
    startNewChat,
    openChat,
    deleteChat,
    confirmProposal,
    dismissProposal,
  }
}
