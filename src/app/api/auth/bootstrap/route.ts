import { getAdminAuth, getAdminFirestore } from '@/lib/firebase/admin'
import { FieldValue } from 'firebase-admin/firestore'
import { cookies } from 'next/headers'

interface BootstrapBody {
  idToken: string
}

export async function POST(request: Request): Promise<Response> {
  let body: BootstrapBody
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { idToken } = body
  if (!idToken || typeof idToken !== 'string') {
    return Response.json({ error: 'idToken is required' }, { status: 400 })
  }

  let uid: string
  let displayName: string
  let email: string

  try {
    const decoded = await getAdminAuth().verifyIdToken(idToken)
    uid = decoded.uid
    displayName = decoded.name ?? ''
    email = decoded.email ?? ''
  } catch (err) {
    console.error('Token verification failed:', err)
    return Response.json({ error: 'Invalid or expired token' }, { status: 401 })
  }

  try {
    const db = getAdminFirestore()
    const docRef = db.collection('teachers').doc(uid)
    const docSnap = await docRef.get()

    if (!docSnap.exists) {
      await docRef.set({
        displayName,
        email,
        createdAt: FieldValue.serverTimestamp(),
      })
    }

    const finalSnap = await docRef.get()
    const data = finalSnap.data()!

    // Max age is in seconds. 60 * 60 * 24 * 7 (7 days)
    const cookieStore = await cookies()
    cookieStore.set('auth_session', '1', {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
      secure: process.env.NODE_ENV === 'production',
    })

    return Response.json({
      teacher: {
        uid,
        displayName: data.displayName,
        email:       data.email,
        createdAt:   data.createdAt.toDate().toISOString(),
      },
    })
  } catch (err) {
    console.error('Firestore operation failed:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
