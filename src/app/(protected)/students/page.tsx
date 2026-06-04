import type { Metadata } from 'next'

import { StudentsTable } from './students-table'

export const metadata: Metadata = {
  title: 'Students Overview — Verbly',
}

export default function StudentsPage() {
  return <StudentsTable />
}
