import { verifyAuth } from '@/lib/server/verifyAuth'
import type { ChatSummary } from '@/types/chat'

import { chatsCollection, toChatSummary } from './lib/store'

/** How many threads the sidebar shows; older ones stay in Firestore. */
const MAX_CHATS = 50

/** GET /api/chat/history — the tutor's saved threads, most recent first. */
export async function GET(request: Request): Promise<Response> {
  const auth = await verifyAuth(request)
  if (!auth.ok) return auth.response

  const snap = await chatsCollection(auth.tutorUid)
    .orderBy('updatedAt', 'desc')
    .limit(MAX_CHATS)
    .get()

  const chats: ChatSummary[] = snap.docs.map(toChatSummary)
  return Response.json({ chats })
}
