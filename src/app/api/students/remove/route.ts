import { getAdminFirestore } from '@/lib/firebase/admin'
import { assertTutorOwnsStudent } from '@/lib/server/assertTutorOwnsStudent'
import { verifyIdToken } from '@/lib/server/verifyAuth'

interface RemoveStudentBody {
  idToken: string
  studentUid: string
}

export async function POST(request: Request): Promise<Response> {
  let body: RemoveStudentBody
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { idToken, studentUid } = body
  if (!idToken || !studentUid) {
    return Response.json({ error: 'idToken and studentUid are required' }, { status: 400 })
  }

  const auth = await verifyIdToken(idToken)
  if (!auth.ok) return auth.response

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
