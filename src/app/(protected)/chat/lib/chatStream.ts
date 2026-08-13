import { authedFetch } from '@/lib/client/authedFetch'
import type { ChatRequestBody, ChatStreamEvent } from '@/types/chat'

const DATA_PREFIX = 'data: '

export interface ChatTurnRequest {
  studentUid: string
  message: string
  /** Chains onto the running Gemini interaction; null on the first turn. */
  previousInteractionId: string | null
}

/**
 * POSTs one tutor message and invokes `onEvent` for each SSE frame the route
 * streams back, resolving when the stream ends.
 *
 * Aborting the signal rejects out of the underlying fetch, so callers must check
 * `signal.aborted` before treating a rejection as a failure.
 */
export async function streamChatTurn(
  request: ChatTurnRequest,
  signal: AbortSignal,
  onEvent: (event: ChatStreamEvent) => void,
): Promise<void> {
  const body: ChatRequestBody = {
    studentUid: request.studentUid,
    message: request.message,
    previousInteractionId: request.previousInteractionId ?? undefined,
    timezoneOffsetMinutes: -new Date().getTimezoneOffset(),
  }

  const res = await authedFetch('/api/chat', {
    method: 'POST',
    body: JSON.stringify(body),
    signal,
  })
  if (!res?.ok || !res.body) throw new Error(`Request failed: ${res?.status}`)

  await readEventStream(res.body, onEvent)
}

/** Splits the byte stream on blank lines and hands over each `data:` payload. */
async function readEventStream(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: ChatStreamEvent) => void,
): Promise<void> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  for (;;) {
    const { done, value } = await reader.read()
    if (done) return
    buffer += decoder.decode(value, { stream: true })

    let separator
    while ((separator = buffer.indexOf('\n\n')) !== -1) {
      const line = buffer.slice(0, separator).trim()
      buffer = buffer.slice(separator + 2)
      if (!line.startsWith(DATA_PREFIX)) continue
      try {
        onEvent(JSON.parse(line.slice(DATA_PREFIX.length)) as ChatStreamEvent)
      } catch {
        // Ignore malformed frames; the stream continues.
      }
    }
  }
}
