import { getAdminAuth, getAdminFirestore } from '@/lib/firebase/admin'

interface AddStudentBody {
  idToken: string
  studentEmail: string
}

export async function POST(request: Request): Promise<Response> {
  let body: AddStudentBody
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { idToken, studentEmail } = body
  if (!idToken || !studentEmail) {
    return Response.json({ error: 'idToken and studentEmail are required' }, { status: 400 })
  }

  let teacherUid: string
  try {
    const decoded = await getAdminAuth().verifyIdToken(idToken)
    teacherUid = decoded.uid
  } catch {
    return Response.json({ error: 'Invalid or expired token' }, { status: 401 })
  }

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

  await studentDocRef.update({ teacherId: teacherUid })

  return Response.json({
    student: { uid: studentUid, name: studentName, email: resolvedEmail },
  })
}
