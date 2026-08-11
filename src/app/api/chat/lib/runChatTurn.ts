import { GEMINI_MODEL, getGemini } from '@/lib/gemini/client'
import { getTodayDateString } from '@/lib/server/dayBounds'
import type { ChatStreamEvent } from '@/types/chat'

import { buildSystemInstruction } from './prompt'
import { executeTool, TOOL_DECLARATIONS, type ToolContext } from './tools'

/** Upper bound on model→tool→model rounds within one tutor message. */
const MAX_TOOL_ROUNDS = 6

interface PendingCall {
  id: string
  name: string
  /** Arguments provided whole on step.start (may be empty when streamed as deltas). */
  baseArguments: Record<string, unknown>
  /** Concatenated arguments_delta JSON fragments. */
  partialJson: string
}

interface FunctionResultInput {
  type: 'function_result'
  call_id: string
  name: string
  result: Array<{ type: 'text'; text: string }>
}

export interface ChatTurnParams {
  tutorUid: string
  studentUid: string
  studentName: string
  message: string
  previousInteractionId?: string
  timezoneOffsetMinutes: number
  emit: (event: ChatStreamEvent) => void
}

/**
 * Runs one tutor message to completion: streams the model's text as SSE events,
 * executes any function calls it makes, and feeds results back (chained via
 * previous_interaction_id) until the model answers with plain text.
 */
export async function runChatTurn(params: ChatTurnParams): Promise<void> {
  const { emit } = params
  const ai = getGemini()
  const systemInstruction = buildSystemInstruction(
    params.studentName,
    getTodayDateString(params.timezoneOffsetMinutes),
  )
  const toolContext: ToolContext = {
    tutorUid: params.tutorUid,
    studentUid: params.studentUid,
    timezoneOffsetMinutes: params.timezoneOffsetMinutes,
    emit,
  }

  let input: string | FunctionResultInput[] = params.message
  let previousInteractionId = params.previousInteractionId

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
    // Only sent once there is a prior interaction to continue from — the first
    // turn of a conversation has none.
    let continuation: { previous_interaction_id?: string } = {}
    if (previousInteractionId) {
      continuation = { previous_interaction_id: previousInteractionId }
    }

    const stream = await ai.interactions.create({
      model: GEMINI_MODEL,
      input,
      stream: true,
      system_instruction: systemInstruction,
      tools: TOOL_DECLARATIONS,
      // These are lookup-and-summarise turns, not hard reasoning. Low thinking
      // keeps the tutor from watching a spinner on questions like "how did he do
      // this week"; the model still reasons enough to chain tools for a plan.
      generation_config: { thinking_level: 'low' },
      ...continuation,
    })

    const pendingCalls = new Map<number, PendingCall>()

    for await (const event of stream) {
      switch (event.event_type) {
        case 'step.start':
          if (event.step.type === 'function_call') {
            pendingCalls.set(event.index, {
              id: event.step.id,
              name: event.step.name,
              baseArguments: event.step.arguments ?? {},
              partialJson: '',
            })
          }
          break

        case 'step.delta':
          if (event.delta.type === 'text') {
            emit({ type: 'text', text: event.delta.text })
          } else if (event.delta.type === 'arguments_delta') {
            const call = pendingCalls.get(event.index)
            if (call) call.partialJson += event.delta.arguments ?? ''
          }
          break

        case 'interaction.completed':
          previousInteractionId = event.interaction.id
          break

        case 'error':
          throw new Error('Gemini stream reported an error event')
      }
    }

    if (pendingCalls.size === 0) {
      emit({ type: 'done', interactionId: previousInteractionId ?? null })
      return
    }

    const results: FunctionResultInput[] = []
    for (const call of pendingCalls.values()) {
      emit({ type: 'tool', name: call.name })
      const result = await executeTool(call.name, parseArguments(call), toolContext)
      results.push({
        type: 'function_result',
        call_id: call.id,
        name: call.name,
        result: [{ type: 'text', text: JSON.stringify(result) }],
      })
    }
    input = results
  }

  // The model kept requesting tools past the cap — surface a graceful stop.
  emit({ type: 'text', text: 'Sorry — I could not finish that request. Please try rephrasing it.' })
  emit({ type: 'done', interactionId: previousInteractionId ?? null })
}

/** Streamed argument deltas win over the (possibly empty) step.start snapshot. */
function parseArguments(call: PendingCall): Record<string, unknown> {
  if (call.partialJson) {
    try {
      return JSON.parse(call.partialJson) as Record<string, unknown>
    } catch {
      console.error(`[chat] unparseable streamed arguments for ${call.name}`)
    }
  }
  return call.baseArguments
}
