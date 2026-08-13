import { getAdminFirestore } from '@/lib/firebase/admin'
import { verifyAuth } from '@/lib/server/verifyAuth'
import { enforceIpRateLimit } from '@/lib/server/rateLimit'

const RANGE_END = '\uf8ff'

export async function GET(request: Request): Promise<Response> {
  const ipLimited = await enforceIpRateLimit(request)
  if (ipLimited) return ipLimited

  const auth = await verifyAuth(request)
  if (!auth.ok) return auth.response

  const { searchParams } = new URL(request.url)
  const searchQuery = (searchParams.get('q') ?? '').toLowerCase()
  if (searchQuery.length < 4) {
    return Response.json({ students: [] })
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
