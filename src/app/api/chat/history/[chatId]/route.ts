import { assertTutorOwnsStudent } from '@/lib/server/assertTutorOwnsStudent'
import { verifyAuth } from '@/lib/server/verifyAuth'
import type { ChatItem, SaveChatBody, SavedChat } from '@/types/chat'

import { parseChatItems } from '../lib/parseChatItems'
import { chatsCollection, toChatSummary } from '../lib/store'

type RouteContext = { params: Promise<{ chatId: string }> }

/** Client-generated UUIDs; anything else is not a chat we wrote. */
const CHAT_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/

const MAX_TITLE_LENGTH = 120
/** Firestore caps documents at 1 MiB — stay well clear of it. */
const MAX_THREAD_BYTES = 700_000

function badChatId(chatId: string): boolean {
  return !CHAT_ID_PATTERN.test(chatId)
}

/** GET /api/chat/history/[chatId] — one saved thread, ready to render. */
export async function GET(request: Request, context: RouteContext): Promise<Response> {
  const auth = await verifyAuth(request)
  if (!auth.ok) return auth.response

  const { chatId } = await context.params
  if (badChatId(chatId)) {
    return Response.json({ error: 'Chat not found' }, { status: 404 })
  }

  const snap = await chatsCollection(auth.tutorUid).doc(chatId).get()
  if (!snap.exists) {
    return Response.json({ error: 'Chat not found' }, { status: 404 })
  }

  const data = snap.data() ?? {}
  const chat: SavedChat = {
    ...toChatSummary(snap),
    items: (data.items as ChatItem[] | undefined) ?? [],
    interactionId: (data.interactionId as string | undefined) ?? null,
  }
  return Response.json({ chat })
}

/**
 * PUT /api/chat/history/[chatId] — upsert the whole thread.
 *
 * The chat UI is the source of truth: it holds proposal statuses and streamed
 * text that the server never sees assembled, so it writes the thread back after
 * every completed turn rather than the stream persisting messages piecemeal.
 */
export async function PUT(request: Request, context: RouteContext): Promise<Response> {
  const auth = await verifyAuth(request)
  if (!auth.ok) return auth.response

  const { chatId } = await context.params
  if (badChatId(chatId)) {
    return Response.json({ error: 'Invalid chat id' }, { status: 400 })
  }

  const body = (await request.json().catch(() => null)) as SaveChatBody | null

  let studentUid = ''
  if (typeof body?.studentUid === 'string') {
    studentUid = body.studentUid
  }
  if (!studentUid) {
    return Response.json({ error: 'studentUid is required' }, { status: 400 })
  }

  const denied = await assertTutorOwnsStudent(auth.tutorUid, studentUid)
  if (denied) return denied

  const items = parseChatItems(body?.items)
  if (!items) {
    return Response.json({ error: 'items must be a non-empty array of chat items' }, { status: 400 })
  }
  if (JSON.stringify(items).length > MAX_THREAD_BYTES) {
    return Response.json({ error: 'This conversation is too long to save' }, { status: 413 })
  }

  let studentName = ''
  if (typeof body?.studentName === 'string') {
    studentName = body.studentName.slice(0, MAX_TITLE_LENGTH)
  }

  let title = 'New chat'
  if (typeof body?.title === 'string' && body.title.trim()) {
    title = body.title.trim().slice(0, MAX_TITLE_LENGTH)
  }

  let interactionId: string | null = null
  if (typeof body?.interactionId === 'string') {
    interactionId = body.interactionId
  }

  const updatedAt = new Date()
  const ref = chatsCollection(auth.tutorUid).doc(chatId)
  await ref.set({ title, studentUid, studentName, items, interactionId, updatedAt })

  return Response.json({
    chat: { id: chatId, title, studentUid, studentName, updatedAt: updatedAt.toISOString() },
  })
}

/** DELETE /api/chat/history/[chatId] — drop a thread from the sidebar for good. */
export async function DELETE(request: Request, context: RouteContext): Promise<Response> {
  const auth = await verifyAuth(request)
  if (!auth.ok) return auth.response

  const { chatId } = await context.params
  if (badChatId(chatId)) {
    return Response.json({ error: 'Invalid chat id' }, { status: 400 })
  }

  await chatsCollection(auth.tutorUid).doc(chatId).delete()
  return Response.json({ ok: true })
}
