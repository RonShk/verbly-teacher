import type { Timestamp } from 'firebase-admin/firestore'

import { getAdminFirestore } from '@/lib/firebase/admin'
import { verifyAuth } from '@/lib/server/verifyAuth'
import type { VocabStatusFilter, VocabStudent } from '@/types/student-vocab'
import { fetchVocabCards } from './fetchVocabCards'

const VALID_STATUSES = new Set<string>(['all', 'new', 'learning', 'review', 'relearning', 'due_soon'])

type RouteContext = { params: Promise<{ studentUid: string }> }

/** The roster read doubles as the ownership check; null means not on roster. */
async function fetchRosterStudent(tutorUid: string, studentUid: string): Promise<VocabStudent | null> {
  const snap = await getAdminFirestore()
    .collection('teachers')
    .doc(tutorUid)
    .collection('students')
    .doc(studentUid)
    .get()

  if (!snap.exists || snap.data()?.removedAt != null) return null
  const data = snap.data()
  return {
    name: (data?.name as string | undefined) ?? '',
    email: (data?.email as string | undefined) ?? '',
    linkedAt: (data?.signUpDate as Timestamp | undefined)?.toDate().toISOString() ?? null,
  }
}

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  const auth = await verifyAuth(request)
  if (!auth.ok) return auth.response

  const { studentUid } = await context.params
  if (!studentUid) {
    return Response.json({ error: 'studentUid is required' }, { status: 400 })
  }

  const { searchParams } = new URL(request.url)

  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1)
  const pageSize = Math.max(1, parseInt(searchParams.get('pageSize') ?? '10', 10) || 10)
  const rawStatus = searchParams.get('status') ?? 'all'
  const status: VocabStatusFilter = VALID_STATUSES.has(rawStatus)
    ? (rawStatus as VocabStatusFilter)
    : 'all'
  const q = (searchParams.get('q') ?? '').trim()

  const [student, result] = await Promise.all([
    fetchRosterStudent(auth.tutorUid, studentUid),
    fetchVocabCards({ studentUid, page, pageSize, status, q }),
  ])

  if (!student) {
    return Response.json({ error: 'Student not on your roster' }, { status: 403 })
  }

  return Response.json({ ...result, student })
}
