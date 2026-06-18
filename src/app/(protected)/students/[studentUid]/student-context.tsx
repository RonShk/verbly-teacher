'use client'

import { createContext, useContext } from 'react'
import type { StudentOverviewResponse } from '@/types/student-overview'

export type StudentOverviewError = { status: number; message: string }

export type StudentOverviewState = {
  overview: StudentOverviewResponse | null
  loading: boolean
  error: StudentOverviewError | null
}

export const StudentOverviewContext = createContext<StudentOverviewState>({
  overview: null,
  loading: true,
  error: null,
})

export function useStudentOverview() {
  return useContext(StudentOverviewContext)
}
