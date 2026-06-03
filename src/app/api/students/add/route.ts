import { getAdminAuth, getAdminFirestore } from '@/lib/firebase/admin'
import { verifyAuth } from '@/lib/server/verifyAuth'

interface AddStudentBody {
  studentEmail: string
}

export async function POST(request: Request): Promise<Response> {
  const auth = await verifyAuth(request)
  if (!auth.ok) return auth.response

  let body: AddStudentBody
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { studentEmail } = body
  if (!studentEmail) {
    return Response.json({ error: 'studentEmail is required' }, { status: 400 })
  }

  const teacherUid = auth.tutorUid

  let studentUid: string
  let studentName: string
  let resolvedEmail: string
  let signUpDate: Date
  try {
    const studentUser = await getAdminAuth().getUserByEmail(studentEmail)
    studentUid = studentUser.uid
    studentName = studentUser.displayName ?? studentEmail
    resolvedEmail = studentUser.email ?? studentEmail
    signUpDate = new Date(studentUser.metadata.creationTime)
  } catch (err: unknown) {
    const code = (err as { code?: string }).code
    if (code === 'auth/user-not-found') {
      return Response.json({ error: 'not_found' }, { status: 404 })
    }
    console.error('Auth lookup failed:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }

  const db = getAdminFirestore()
  const studentDocRef = db.collection('students').doc(studentUid)

  const rosterRef = db
    .collection('teachers')
    .doc(teacherUid)
    .collection('students')
    .doc(studentUid)

  const existing = await rosterRef.get()
  if (existing.exists) {
    return Response.json({ error: 'already_added' }, { status: 409 })
  }

  await rosterRef.set({
    name: studentName,
    email: resolvedEmail,
    signUpDate,
  })

  await studentDocRef.set({ teacherId: teacherUid }, { merge: true })

  return Response.json({
    student: { uid: studentUid, name: studentName, email: resolvedEmail },
  })
}
