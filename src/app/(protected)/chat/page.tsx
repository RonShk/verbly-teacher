import type { Metadata } from 'next'
import { ChatView } from './chat-view'

export const metadata: Metadata = {
  title: 'Chat — Verbly',
}

export default function ChatPage() {
  return <ChatView />
}
