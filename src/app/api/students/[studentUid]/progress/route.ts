import { buildStudentProgress } from './buildStudentProgress'
import { parseTimezoneOffsetMinutes } from '@/lib/server/dayBounds'
import { assertTutorOwnsStudent } from '@/lib/server/assertTutorOwnsStudent'
import { verifyAuth } from '@/lib/server/verifyAuth'

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
  const timezoneOffsetMinutes = parseTimezoneOffsetMinutes(searchParams)
  const weekStartParam = searchParams.get('weekStart') ?? undefined

  const progress = await buildStudentProgress(studentUid, timezoneOffsetMinutes, weekStartParam)

  return Response.json(progress)
}
