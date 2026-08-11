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
