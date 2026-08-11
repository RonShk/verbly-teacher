import type { Timestamp } from 'firebase-admin/firestore'

import { getAdminFirestore } from '@/lib/firebase/admin'
import { assertTutorOwnsStudent } from '@/lib/server/assertTutorOwnsStudent'
import { verifyAuth } from '@/lib/server/verifyAuth'
import type { VocabStatusFilter, VocabStudent } from '@/types/student-vocab'
import { fetchVocabCards } from './fetchVocabCards'
import { addVocabCards, MAX_MUTATION_WORDS, removeVocabCards, type WordPair } from './mutateVocabCards'

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

function parseWordPairs(value: unknown): WordPair[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_MUTATION_WORDS) return null
  const pairs: WordPair[] = []
  for (const item of value) {
    const { spanish, english } = (item ?? {}) as Record<string, unknown>
    if (typeof spanish !== 'string' || typeof english !== 'string') return null
    if (!spanish.trim() || !english.trim()) return null
    pairs.push({ spanish, english })
  }
  return pairs
}

/** POST /api/students/[studentUid]/vocab — add new cards. Body: { words: [{ spanish, english }] } */
export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const auth = await verifyAuth(request)
  if (!auth.ok) return auth.response

  const { studentUid } = await context.params
  const denied = await assertTutorOwnsStudent(auth.tutorUid, studentUid)
  if (denied) return denied

  const body = await request.json().catch(() => null)
  const words = parseWordPairs((body as { words?: unknown } | null)?.words)
  if (!words) {
    return Response.json(
      { error: `words must be 1-${MAX_MUTATION_WORDS} pairs of non-empty { spanish, english } strings` },
      { status: 400 },
    )
  }

  const result = await addVocabCards(studentUid, words)
  return Response.json(result)
}

/** DELETE /api/students/[studentUid]/vocab — remove cards. Body: { cardIds: string[] } */
export async function DELETE(request: Request, context: RouteContext): Promise<Response> {
  const auth = await verifyAuth(request)
  if (!auth.ok) return auth.response

  const { studentUid } = await context.params
  const denied = await assertTutorOwnsStudent(auth.tutorUid, studentUid)
  if (denied) return denied

  const body = await request.json().catch(() => null)
  const cardIds = (body as { cardIds?: unknown } | null)?.cardIds
  let validIds: string[] = []
  if (Array.isArray(cardIds) && cardIds.length > 0 && cardIds.length <= MAX_MUTATION_WORDS) {
    validIds = cardIds.filter((id): id is string => typeof id === 'string' && id.length > 0)
  }
  if (validIds.length === 0) {
    return Response.json(
      { error: `cardIds must be 1-${MAX_MUTATION_WORDS} non-empty strings` },
      { status: 400 },
    )
  }

  const result = await removeVocabCards(studentUid, validIds)
  return Response.json(result)
}
