import { getAdminFirestore } from '@/lib/firebase/admin'
import { assertTutorOwnsStudent } from '@/lib/server/assertTutorOwnsStudent'
import { verifyAuth } from '@/lib/server/verifyAuth'

interface RemoveStudentBody {
  studentUid: string
}

export async function POST(request: Request): Promise<Response> {
  const auth = await verifyAuth(request)
  if (!auth.ok) return auth.response

  let body: RemoveStudentBody
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { studentUid } = body
  if (!studentUid) {
    return Response.json({ error: 'studentUid is required' }, { status: 400 })
  }

  const denied = await assertTutorOwnsStudent(auth.tutorUid, studentUid)
  if (denied) return denied

  const db = getAdminFirestore()

  await Promise.all([
    db
      .collection('teachers')
      .doc(auth.tutorUid)
      .collection('students')
      .doc(studentUid)
      .delete(),
    db.collection('students').doc(studentUid).update({ teacherId: null }),
  ])

  return Response.json({ success: true })
}
