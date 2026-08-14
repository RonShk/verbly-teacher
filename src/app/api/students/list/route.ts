import { getAdminFirestore } from '@/lib/firebase/admin'
import { verifyAuth } from '@/lib/server/verifyAuth'
import { enforceIpRateLimit } from '@/lib/server/rateLimit'

export async function GET(request: Request): Promise<Response> {
  const ipLimited = await enforceIpRateLimit(request)
  if (ipLimited) return ipLimited

  const auth = await verifyAuth(request)
  if (!auth.ok) return auth.response

  const db = getAdminFirestore()
  const rosterSnap = await db
    .collection('teachers')
    .doc(auth.tutorUid)
    .collection('students')
    .orderBy('signUpDate', 'asc')
    .get()

  const students = rosterSnap.docs.map((doc) => {
    const { name, email, signUpDate, inviteStatus } = doc.data()
    return {
      uid: doc.id,
      name,
      email,
      signUpDate: signUpDate?.toDate?.()?.toISOString() ?? null,
      inviteStatus: inviteStatus ?? 'accepted',
      inviteId: null as string | null,
    }
  })

  const listedEmails = new Set(students.map((student) => student.email?.toLowerCase()))
  const inviteSnap = await db.collection('studentInvites')
    .where('teacherUid', '==', auth.tutorUid)
    .get()

  const latestInviteByEmail = new Map<string, { id: string; data: FirebaseFirestore.DocumentData }>()
  for (const inviteDoc of inviteSnap.docs) {
    const invite = inviteDoc.data()
    const email = typeof invite.email === 'string' ? invite.email.trim().toLowerCase() : ''
    const status = String(invite.status)
    if (!email || !['pending', 'sent', 'email_failed'].includes(status)) continue
    const previous = latestInviteByEmail.get(email)
    const createdAt = invite.createdAt?.toMillis?.() ?? 0
    const previousCreatedAt = previous?.data.createdAt?.toMillis?.() ?? 0
    if (!previous || createdAt > previousCreatedAt) latestInviteByEmail.set(email, { id: inviteDoc.id, data: invite })
  }

  for (const [email, invite] of latestInviteByEmail) {
    const existingIndex = students.findIndex((student) => student.email?.toLowerCase() === email)
    if (existingIndex >= 0) {
      if (students[existingIndex].inviteStatus !== 'accepted') {
        students[existingIndex].inviteStatus = String(invite.data.status) as 'pending' | 'sent' | 'email_failed'
        students[existingIndex].inviteId = invite.id
      }
      continue
    }
    students.push({
      uid: `pending:${invite.id}`,
      name: 'Pending invitation',
      email,
      signUpDate: null,
      inviteStatus: String(invite.data.status) as 'pending' | 'sent' | 'email_failed',
      inviteId: invite.id,
    })
    listedEmails.add(email)
  }

  return Response.json({ students })
}
