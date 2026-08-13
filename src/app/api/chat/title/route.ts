import { GEMINI_MODEL, getGemini } from '@/lib/gemini/client'
import { checkRateLimit, tooManyRequests } from '@/lib/server/rateLimit'
import { verifyAuth } from '@/lib/server/verifyAuth'

import { CHAT_TITLE_LIMIT } from '../lib/rateLimits'

const MAX_MESSAGE_LENGTH = 4000
const MAX_TITLE_LENGTH = 60

const INSTRUCTION = `You label chat threads in a language-tutoring dashboard.

Given the tutor's opening message, reply with a title of at most six words naming
what the thread is about. Reply with the title alone — no quotes, no trailing
punctuation, no explanation.`

/**
 * POST /api/chat/title — a short sidebar label for a thread's opening message.
 *
 * Runs alongside the answer rather than as part of it: the thread is already
 * saved under the tutor's raw message by the time this returns.
 */
export async function POST(request: Request): Promise<Response> {
  const auth = await verifyAuth(request)
  if (!auth.ok) return auth.response

  const body = (await request.json().catch(() => null)) as { message?: unknown } | null
  let message = ''
  if (typeof body?.message === 'string') {
    message = body.message.trim().slice(0, MAX_MESSAGE_LENGTH)
  }
  if (!message) {
    return Response.json({ error: 'message is required' }, { status: 400 })
  }

  // Naming is best-effort — the caller falls back to the tutor's raw message,
  // so a throttled title never blocks the conversation.
  const rate = await checkRateLimit(auth.tutorUid, CHAT_TITLE_LIMIT)
  if (!rate.allowed) {
    return tooManyRequests(rate, 'chat name suggestions')
  }

  try {
    const interaction = await getGemini().interactions.create({
      model: GEMINI_MODEL,
      input: message,
      system_instruction: INSTRUCTION,
      generation_config: { thinking_level: 'low' },
    })

    const title = cleanTitle(interaction.output_text ?? '')
    if (!title) {
      return Response.json({ error: 'No title generated' }, { status: 502 })
    }
    return Response.json({ title })
  } catch (err) {
    console.error('[chat] title generation failed:', err)
    return Response.json({ error: 'Could not generate a title' }, { status: 502 })
  }
}

/** Models like to wrap a title in quotes or end it with a period. */
function cleanTitle(raw: string): string {
  const firstLine = raw.trim().split('\n')[0] ?? ''
  return firstLine
    .replace(/^["'`“”]+/, '')
    .replace(/["'`.“”]+$/, '')
    .trim()
    .slice(0, MAX_TITLE_LENGTH)
}
