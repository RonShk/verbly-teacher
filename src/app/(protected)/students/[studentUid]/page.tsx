import type { Metadata } from 'next'

import { StudentOverview } from './student-overview'

export const metadata: Metadata = {
  title: 'Student Overview — Verbly',
}

export default function StudentPage() {
  return (
    <div className="min-h-screen bg-background">
      <StudentOverview />
    </div>
  )
}
