import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Students — Verbly',
}

export default function StudentsPage() {
  return (
    <div className="min-h-screen bg-[#141414] flex flex-col items-center justify-center">
      <h1 className="text-2xl font-bold text-white">Student Dashboard</h1>
    </div>
  )
}
