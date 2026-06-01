import { getAdminAuth, getAdminFirestore } from '@/lib/firebase/admin'

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

  let teacherUid: string
  try {
    const decoded = await getAdminAuth().verifyIdToken(idToken)
    teacherUid = decoded.uid
  } catch {
    return Response.json({ error: 'Invalid or expired token' }, { status: 401 })
  }

  const db = getAdminFirestore()

  await Promise.all([
    db.collection('teachers').doc(teacherUid).collection('students').doc(studentUid).delete(),
    db.collection('students').doc(studentUid).update({ teacherId: null }),
  ])

  return Response.json({ success: true })
}
