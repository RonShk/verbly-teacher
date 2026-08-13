import { authedFetch } from '@/lib/client/authedFetch'
import type { ChatSummary, SaveChatBody, SavedChat } from '@/types/chat'

/**
 * Client for /api/chat/history. Reads that the sidebar can shrug off return
 * null; the two calls whose failure the caller must react to throw instead.
 */

/** The tutor's saved threads for the sidebar; null when the list could not be read. */
export async function listChats(): Promise<ChatSummary[] | null> {
  try {
    const res = await authedFetch('/api/chat/history')
    if (!res?.ok) return null
    const data = (await res.json()) as { chats: ChatSummary[] }
    return data.chats
  } catch {
    return null
  }
}

/** Throws when the thread cannot be read, so the caller can detach from it. */
export async function loadChat(chatId: string): Promise<SavedChat> {
  const res = await authedFetch(`/api/chat/history/${chatId}`)
  if (!res?.ok) throw new Error(`Request failed: ${res?.status}`)
  const data = (await res.json()) as { chat: SavedChat }
  return data.chat
}

/** Upserts the whole thread; null when the save did not land. */
export async function saveChat(chatId: string, body: SaveChatBody): Promise<ChatSummary | null> {
  try {
    const res = await authedFetch(`/api/chat/history/${chatId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    })
    if (!res?.ok) return null
    const data = (await res.json()) as { chat: ChatSummary }
    return data.chat
  } catch {
    return null
  }
}

/** Retitles a thread without rewriting it. Throws when the write did not land. */
export async function renameChat(chatId: string, title: string): Promise<void> {
  const res = await authedFetch(`/api/chat/history/${chatId}`, {
    method: 'PATCH',
    body: JSON.stringify({ title }),
  })
  if (!res?.ok) throw new Error(`Request failed: ${res?.status}`)
}

/** Throws when the delete did not land, so the caller can restore the row. */
export async function deleteChat(chatId: string): Promise<void> {
  const res = await authedFetch(`/api/chat/history/${chatId}`, { method: 'DELETE' })
  if (!res?.ok) throw new Error(`Request failed: ${res?.status}`)
}

/** A short AI label for a thread's opening message; null when generation failed. */
export async function generateTitle(message: string): Promise<string | null> {
  try {
    const res = await authedFetch('/api/chat/title', {
      method: 'POST',
      body: JSON.stringify({ message }),
    })
    if (!res?.ok) return null
    const data = (await res.json()) as { title: string }
    return data.title
  } catch {
    return null
  }
}
