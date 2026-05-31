import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Chat — Verbly',
}

export default function ChatPage() {
  return (
    <div className="min-h-screen bg-[#141414] flex flex-col items-center justify-center">
      <h1 className="text-2xl font-bold text-white">Chat</h1>
    </div>
  )
}
