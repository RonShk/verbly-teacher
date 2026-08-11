import { Suspense } from 'react'
import type { Metadata } from 'next'
import { ChatView } from './chat-view'

export const metadata: Metadata = {
  title: 'Chat — Verbly',
}

export default function ChatPage() {
  // ChatView reads ?student and ?prompt via useSearchParams, which needs a
  // Suspense boundary so the rest of the route can still be prerendered.
  return (
    <Suspense fallback={null}>
      <ChatView />
    </Suspense>
  )
}
