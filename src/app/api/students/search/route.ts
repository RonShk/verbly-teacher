import { getAdminAuth, getAdminFirestore } from '@/lib/firebase/admin'

const RANGE_END = '\uf8ff'

export async function GET(request: Request): Promise<Response> {
  const authHeader = request.headers.get('Authorization')
  const idToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!idToken) {
    return Response.json({ error: 'Authorization header required' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const searchQuery = (searchParams.get('q') ?? '').toLowerCase()
  if (searchQuery.length < 4) {
    return Response.json({ students: [] })
  }

  try {
    await getAdminAuth().verifyIdToken(idToken)
  } catch {
    return Response.json({ error: 'Invalid or expired token' }, { status: 401 })
  }

  const db = getAdminFirestore()
  const snap = await db
    .collection('students')
    .where('email', '>=', searchQuery)
    .where('email', '<=', searchQuery + RANGE_END)
    .limit(6)
    .get()

  const students = snap.docs.map((doc) => {
    const { displayName, email, createdAt } = doc.data()
    return {
      uid: doc.id,
      name: displayName ?? '',
      email: email ?? '',
      signUpDate: createdAt?.toDate?.()?.toISOString() ?? null,
    }
  })

  return Response.json({ students })
}
