import { getAdminFirestore } from '@/lib/firebase/admin'
import { verifyAuth } from '@/lib/server/verifyAuth'

export async function GET(request: Request): Promise<Response> {
  const auth = await verifyAuth(request)
  if (!auth.ok) return auth.response

  const db = getAdminFirestore()
  const snap = await db
    .collection('teachers')
    .doc(auth.tutorUid)
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
