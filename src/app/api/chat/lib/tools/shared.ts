import type { ChatStreamEvent } from '@/types/chat'

/** Word-pair cap shared by both proposal tools (matches MAX_MUTATION_WORDS on the vocab API). */
export const MAX_PROPOSAL_WORDS = 50

/** Per-call context every tool executor receives. */
export interface ToolContext {
  tutorUid: string
  studentUid: string
  timezoneOffsetMinutes: number
  /** Pushes a UI event into the SSE stream (proposal cards, lesson plan files). */
  emit: (event: ChatStreamEvent) => void
}

/** Gemini Interactions API function-tool declaration. */
export interface ToolDeclaration {
  type: 'function'
  name: string
  description: string
  parameters: Record<string, unknown>
}

/** One chat tool: the schema Gemini sees plus the code that runs when it calls it. */
export interface ChatTool {
  declaration: ToolDeclaration
  execute: (args: Record<string, unknown>, ctx: ToolContext) => Promise<unknown> | unknown
}

/** Coerces an untrusted numeric argument into [min, max], rounding; falls back when absent. */
export function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  let n = fallback
  if (typeof value === 'number' && Number.isFinite(value)) {
    n = Math.round(value)
  }
  return Math.min(max, Math.max(min, n))
}
