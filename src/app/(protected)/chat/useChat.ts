'use client'

import { useCallback, useRef, useState } from 'react'

import { clientAuth } from '@/lib/firebase/client'
import type { ChatStreamEvent, LessonPlanFile, VocabProposal } from '@/types/chat'

export type ProposalStatus = 'pending' | 'working' | 'confirmed' | 'dismissed'

export type ChatItem =
  | { id: string; kind: 'user'; text: string }
  | { id: string; kind: 'assistant'; text: string }
  | { id: string; kind: 'activity'; label: string }
  | { id: string; kind: 'proposal'; proposal: VocabProposal; status: ProposalStatus; summary?: string }
  | { id: string; kind: 'lesson-plan'; plan: LessonPlanFile }

/** Friendly labels for data-reading tools; proposal/plan tools render cards instead. */
const TOOL_LABELS: Record<string, string> = {
  get_student_overview: 'Looked up the student overview',
  get_assignment_performance: 'Analyzed assignment performance',
  list_vocab_words: 'Reviewed the vocabulary deck',
}

let nextId = 0
function makeId(): string {
  return `msg-${++nextId}`
}

/**
 * Chat state for one student: streams answers from POST /api/chat, applies
 * confirmed vocab proposals through the vocab API, and notifies the model
 * about confirmations with hidden "[APP EVENT]" messages.
 */
export function useChat(studentUid: string | null) {
  const [items, setItems] = useState<ChatItem[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [prevStudentUid, setPrevStudentUid] = useState(studentUid)
  const interactionIdRef = useRef<string | null>(null)
  const currentAssistantIdRef = useRef<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Switching students starts a fresh conversation (state-adjustment-during-render pattern).
  if (prevStudentUid !== studentUid) {
    setPrevStudentUid(studentUid)
    setItems([])
    interactionIdRef.current = null
    currentAssistantIdRef.current = null
  }

  const appendItem = useCallback((item: ChatItem) => {
    setItems((prev) => [...prev, item])
  }, [])

  const updateItem = useCallback((id: string, patch: Partial<ChatItem>) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item
        return { ...item, ...patch } as ChatItem
      }),
    )
  }, [])

  const handleEvent = useCallback(
    (event: ChatStreamEvent) => {
      switch (event.type) {
        case 'text': {
          const currentId = currentAssistantIdRef.current
          if (currentId) {
            setItems((prev) =>
              prev.map((item) => {
                if (item.id !== currentId || item.kind !== 'assistant') return item
                return { ...item, text: item.text + event.text }
              }),
            )
          } else {
            const id = makeId()
            currentAssistantIdRef.current = id
            appendItem({ id, kind: 'assistant', text: event.text })
          }
          break
        }
        case 'tool': {
          currentAssistantIdRef.current = null
          const label = TOOL_LABELS[event.name]
          if (label) appendItem({ id: makeId(), kind: 'activity', label })
          break
        }
        case 'proposal':
          currentAssistantIdRef.current = null
          appendItem({ id: makeId(), kind: 'proposal', proposal: event.proposal, status: 'pending' })
          break
        case 'lesson_plan':
          currentAssistantIdRef.current = null
          appendItem({ id: makeId(), kind: 'lesson-plan', plan: event.plan })
          break
        case 'done':
          interactionIdRef.current = event.interactionId
          break
        case 'error':
          currentAssistantIdRef.current = null
          appendItem({ id: makeId(), kind: 'assistant', text: event.message })
          break
      }
    },
    [appendItem],
  )

  const send = useCallback(
    async (text: string, options?: { hidden?: boolean }) => {
      const message = text.trim()
      const user = clientAuth.currentUser
      if (!message || !studentUid || !user) return

      setIsStreaming(true)
      if (!options?.hidden) appendItem({ id: makeId(), kind: 'user', text: message })
      currentAssistantIdRef.current = null

      const controller = new AbortController()
      abortRef.current = controller

      try {
        const token = await user.getIdToken()
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            studentUid,
            message,
            previousInteractionId: interactionIdRef.current ?? undefined,
            timezoneOffsetMinutes: -new Date().getTimezoneOffset(),
          }),
          signal: controller.signal,
        })
        if (!res.ok || !res.body) throw new Error(`Request failed: ${res.status}`)

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          let separator
          while ((separator = buffer.indexOf('\n\n')) !== -1) {
            const line = buffer.slice(0, separator).trim()
            buffer = buffer.slice(separator + 2)
            if (!line.startsWith('data: ')) continue
            try {
              handleEvent(JSON.parse(line.slice(6)) as ChatStreamEvent)
            } catch {
              // Ignore malformed frames; the stream continues.
            }
          }
        }
      } catch {
        // Stopping aborts the fetch, which lands here — that is not an error,
        // and whatever streamed in before the stop stays on screen.
        if (!controller.signal.aborted) {
          appendItem({
            id: makeId(),
            kind: 'assistant',
            text: 'Something went wrong while answering. Please try again.',
          })
        }
      } finally {
        if (abortRef.current === controller) abortRef.current = null
        currentAssistantIdRef.current = null
        setIsStreaming(false)
      }
    },
    [studentUid, appendItem, handleEvent],
  )

  /** Cuts the current answer short; the partial reply is kept. */
  const stop = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  /** Applies a (possibly edited) proposal through the vocab API, then tells the model. */
  const confirmProposal = useCallback(
    async (itemId: string, proposal: VocabProposal) => {
      const user = clientAuth.currentUser
      if (!studentUid || !user) return
      updateItem(itemId, { status: 'working', proposal })

      try {
        const token = await user.getIdToken()
        const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
        let summary: string
        let note: string

        if (proposal.kind === 'add') {
          const res = await fetch(`/api/students/${studentUid}/vocab`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ words: proposal.words }),
          })
          if (!res.ok) throw new Error(`Request failed: ${res.status}`)
          const data = (await res.json()) as { added: number; skippedDuplicates: string[] }
          let addedNoun = 'words'
          if (data.added === 1) {
            addedNoun = 'word'
          }
          summary = `${data.added} ${addedNoun} added`

          let duplicateNote = ''
          if (data.skippedDuplicates.length > 0) {
            summary += ` · ${data.skippedDuplicates.length} already in the deck`
            duplicateNote = `, ${data.skippedDuplicates.length} skipped as duplicates (${data.skippedDuplicates.join(', ')})`
          }
          note = `[APP EVENT] The tutor confirmed the vocabulary proposal: ${data.added} words were added${duplicateNote}.`
        } else {
          const res = await fetch(`/api/students/${studentUid}/vocab`, {
            method: 'DELETE',
            headers,
            body: JSON.stringify({ cardIds: proposal.words.map((w) => w.cardId) }),
          })
          if (!res.ok) throw new Error(`Request failed: ${res.status}`)
          const data = (await res.json()) as { removed: number }
          let removedNoun = 'words'
          if (data.removed === 1) {
            removedNoun = 'word'
          }
          summary = `${data.removed} ${removedNoun} removed`
          note = `[APP EVENT] The tutor confirmed the removal: ${data.removed} vocabulary cards were deleted.`
        }

        updateItem(itemId, { status: 'confirmed', summary })
        void send(note, { hidden: true })
      } catch {
        updateItem(itemId, { status: 'pending', summary: 'Could not apply the change — please try again.' })
      }
    },
    [studentUid, updateItem, send],
  )

  const dismissProposal = useCallback(
    (itemId: string) => {
      updateItem(itemId, { status: 'dismissed' })
      void send('[APP EVENT] The tutor dismissed the proposal without applying it.', { hidden: true })
    },
    [updateItem, send],
  )

  return { items, isStreaming, send, stop, confirmProposal, dismissProposal }
}
