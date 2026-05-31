import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Home — Verbly',
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#141414] flex flex-col items-center justify-center">
      <h1 className="text-2xl font-bold text-white">Home</h1>
    </div>
  )
}
