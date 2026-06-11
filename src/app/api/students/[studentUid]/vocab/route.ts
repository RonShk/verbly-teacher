import { assertTutorOwnsStudent } from '@/lib/server/assertTutorOwnsStudent'
import { verifyAuth } from '@/lib/server/verifyAuth'
import type { VocabStatusFilter } from '@/types/student-vocab'
import { fetchVocabCards } from './fetchVocabCards'

const VALID_STATUSES = new Set<string>(['all', 'new', 'learning', 'review', 'relearning', 'due_soon'])

type RouteContext = { params: Promise<{ studentUid: string }> }

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  const auth = await verifyAuth(request)
  if (!auth.ok) return auth.response

  const { studentUid } = await context.params
  if (!studentUid) {
    return Response.json({ error: 'studentUid is required' }, { status: 400 })
  }

  const denied = await assertTutorOwnsStudent(auth.tutorUid, studentUid)
  if (denied) return denied

  const { searchParams } = new URL(request.url)

  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1)
  const pageSize = Math.max(1, parseInt(searchParams.get('pageSize') ?? '10', 10) || 10)
  const rawStatus = searchParams.get('status') ?? 'all'
  const status: VocabStatusFilter = VALID_STATUSES.has(rawStatus)
    ? (rawStatus as VocabStatusFilter)
    : 'all'
  const q = (searchParams.get('q') ?? '').trim()

  const result = await fetchVocabCards({ studentUid, page, pageSize, status, q })
  return Response.json(result)
}
