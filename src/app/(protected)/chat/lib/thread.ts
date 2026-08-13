import type { ChatItem, ChatStreamEvent } from '@/types/chat'

/** Friendly labels for data-reading tools; proposal/plan tools render cards instead. */
const TOOL_LABELS: Record<string, string> = {
  get_student_overview: 'Looked up the student overview',
  get_assignment_performance: 'Analyzed assignment performance',
  list_vocab_words: 'Reviewed the vocabulary deck',
}

const MAX_TITLE_LENGTH = 120

/** One conversation as the UI holds it — the shape saved to and restored from Firestore. */
export interface ThreadState {
  /** null until the first save mints an id, or until a saved chat is opened. */
  chatId: string | null
  /**
   * The sidebar label once it is settled — generated, renamed, or loaded. Held
   * here so a later save cannot overwrite it with `threadTitle` again.
   */
  title: string | null
  items: ChatItem[]
  /** Resumes the model's own history on the next turn. */
  interactionId: string | null
  /** The assistant item currently collecting streamed text deltas. */
  streamingItemId: string | null
}

export const EMPTY_THREAD: ThreadState = {
  chatId: null,
  title: null,
  items: [],
  interactionId: null,
  streamingItemId: null,
}

// Ids have to stay unique against a thread loaded back from Firestore, whose
// items already carry ids minted by an earlier session.
let nextId = 0
export function makeId(): string {
  return `msg-${Date.now().toString(36)}-${++nextId}`
}

export function appendItem(state: ThreadState, item: ChatItem): ThreadState {
  return { ...state, items: [...state.items, item] }
}

export function patchItem(state: ThreadState, id: string, patch: Partial<ChatItem>): ThreadState {
  return {
    ...state,
    items: state.items.map((item) => {
      if (item.id !== id) return item
      return { ...item, ...patch } as ChatItem
    }),
  }
}

/** Appends to the open assistant bubble, or opens one if this is the first delta. */
function appendText(state: ThreadState, text: string): ThreadState {
  if (!state.streamingItemId) {
    const id = makeId()
    return { ...appendItem(state, { id, kind: 'assistant', text }), streamingItemId: id }
  }
  return {
    ...state,
    items: state.items.map((item) => {
      if (item.id !== state.streamingItemId || item.kind !== 'assistant') return item
      return { ...item, text: item.text + text }
    }),
  }
}

/**
 * Folds one SSE event into the thread. Anything other than a text delta closes
 * the open bubble, so a tool call or card splits the answer in two.
 */
export function applyStreamEvent(state: ThreadState, event: ChatStreamEvent): ThreadState {
  if (event.type === 'text') return appendText(state, event.text)
  if (event.type === 'done') return { ...state, interactionId: event.interactionId }

  const settled = { ...state, streamingItemId: null }
  switch (event.type) {
    case 'tool': {
      const label = TOOL_LABELS[event.name]
      if (!label) return settled
      return appendItem(settled, { id: makeId(), kind: 'activity', label })
    }
    case 'proposal':
      return appendItem(settled, {
        id: makeId(), kind: 'proposal', proposal: event.proposal, status: 'pending',
      })
    case 'lesson_plan':
      return appendItem(settled, { id: makeId(), kind: 'lesson-plan', plan: event.plan })
    case 'error':
      return appendItem(settled, { id: makeId(), kind: 'assistant', text: event.message })
  }
}

/** The provisional label: the first thing the tutor said, until a better one lands. */
export function threadTitle(items: ChatItem[]): string {
  for (const item of items) {
    if (item.kind === 'user') return item.text.slice(0, MAX_TITLE_LENGTH)
  }
  return 'New chat'
}
