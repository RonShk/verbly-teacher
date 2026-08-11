import { getAdminFirestore } from '@/lib/firebase/admin'
import { verifyAuth } from '@/lib/server/verifyAuth'
import type { ChatRequestBody, ChatStreamEvent } from '@/types/chat'

import { runChatTurn } from './lib/runChatTurn'

const MAX_MESSAGE_LENGTH = 4000

/**
 * POST /api/chat — one tutor message about one student.
 * Responds with a Server-Sent Events stream of ChatStreamEvent lines.
 */
export async function POST(request: Request): Promise<Response> {
  const auth = await verifyAuth(request)
  if (!auth.ok) return auth.response

  const body = (await request.json().catch(() => null)) as ChatRequestBody | null
  let studentUid = ''
  if (typeof body?.studentUid === 'string') {
    studentUid = body.studentUid
  }

  let message = ''
  if (typeof body?.message === 'string') {
    message = body.message.trim()
  }

  let previousInteractionId: string | undefined
  if (typeof body?.previousInteractionId === 'string') {
    previousInteractionId = body.previousInteractionId
  }

  let timezoneOffsetMinutes = 0
  if (typeof body?.timezoneOffsetMinutes === 'number' && Number.isFinite(body.timezoneOffsetMinutes)) {
    timezoneOffsetMinutes = body.timezoneOffsetMinutes
  }

  if (!studentUid || !message) {
    return Response.json({ error: 'studentUid and message are required' }, { status: 400 })
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return Response.json({ error: 'Message is too long' }, { status: 400 })
  }

  // Roster read doubles as the ownership check and gives us the student's name.
  const rosterSnap = await getAdminFirestore()
    .collection('teachers')
    .doc(auth.tutorUid)
    .collection('students')
    .doc(studentUid)
    .get()
  if (!rosterSnap.exists || rosterSnap.data()?.removedAt != null) {
    return Response.json({ error: 'Student not on your roster' }, { status: 403 })
  }
  const studentName = (rosterSnap.data()?.name as string | undefined) ?? 'the student'

  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (event: ChatStreamEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
      }
      try {
        await runChatTurn({
          tutorUid: auth.tutorUid,
          studentUid,
          studentName,
          message,
          previousInteractionId,
          timezoneOffsetMinutes,
          emit,
        })
      } catch (err) {
        console.error('[chat] turn failed:', err)
        emit({ type: 'error', message: 'Something went wrong while answering. Please try again.' })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}
