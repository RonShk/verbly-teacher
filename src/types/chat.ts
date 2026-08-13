/** Shared contract between POST /api/chat (SSE producer) and the chat UI (consumer). */

export interface ProposedAddition {
  spanish: string
  english: string
}

export interface ProposedRemoval {
  cardId: string
  spanish: string
  english: string
}

export type VocabProposal =
  | { kind: 'add'; words: ProposedAddition[] }
  | { kind: 'remove'; words: ProposedRemoval[] }

export interface LessonPlanFile {
  title: string
  filename: string
  markdown: string
}

/** One `data:` line in the chat SSE stream. */
export type ChatStreamEvent =
  | { type: 'text'; text: string }
  | { type: 'tool'; name: string }
  | { type: 'proposal'; proposal: VocabProposal }
  | { type: 'lesson_plan'; plan: LessonPlanFile }
  | { type: 'done'; interactionId: string | null }
  | { type: 'error'; message: string }

export interface ChatRequestBody {
  studentUid: string
  message: string
  /** Chains this turn onto the running Gemini interaction; omitted on the first turn. */
  previousInteractionId?: string
  timezoneOffsetMinutes?: number
}

/* ── Saved chats ─────────────────────────────────────────────────────────── */

export type ProposalStatus = 'pending' | 'working' | 'confirmed' | 'dismissed'

/** One rendered entry in a thread. Persisted verbatim under teachers/{uid}/chats. */
export type ChatItem =
  | { id: string; kind: 'user'; text: string }
  | { id: string; kind: 'assistant'; text: string }
  | { id: string; kind: 'activity'; label: string }
  | { id: string; kind: 'proposal'; proposal: VocabProposal; status: ProposalStatus; summary?: string }
  | { id: string; kind: 'lesson-plan'; plan: LessonPlanFile }

/** Sidebar row — enough to list a chat without loading its thread. */
export interface ChatSummary {
  id: string
  title: string
  /** The student this thread is about; selecting the chat re-selects them. */
  studentUid: string
  studentName: string
  updatedAt: string | null
}

/** A full saved thread, as returned by GET /api/chat/history/[chatId]. */
export interface SavedChat extends ChatSummary {
  items: ChatItem[]
  /** Resumes the Gemini interaction chain so the model keeps its own history. */
  interactionId: string | null
}

/** Body of PUT /api/chat/history/[chatId] — the client owns the whole thread. */
export interface SaveChatBody {
  studentUid: string
  studentName: string
  title: string
  items: ChatItem[]
  interactionId: string | null
}
