import { getAdminAuth, getAdminFirestore } from '@/lib/firebase/admin'

export async function GET(request: Request): Promise<Response> {
  const authHeader = request.headers.get('Authorization')
  const idToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!idToken) {
    return Response.json({ error: 'Authorization header required' }, { status: 401 })
  }

  let teacherUid: string
  try {
    const decoded = await getAdminAuth().verifyIdToken(idToken)
    teacherUid = decoded.uid
  } catch {
    return Response.json({ error: 'Invalid or expired token' }, { status: 401 })
  }

  const db = getAdminFirestore()
  const snap = await db
    .collection('teachers')
    .doc(teacherUid)
    .collection('students')
    .orderBy('signUpDate', 'asc')
    .get()

  const students = snap.docs.map((doc) => {
    const { name, email, signUpDate } = doc.data()
    return {
      uid: doc.id,
      name,
      email,
      signUpDate: signUpDate?.toDate?.()?.toISOString() ?? null,
    }
  })

  return Response.json({ students })
}
