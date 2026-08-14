import { getAdminFirestore } from '@/lib/firebase/admin'
import { assertTutorOwnsStudent } from '@/lib/server/assertTutorOwnsStudent'
import { verifyAuth } from '@/lib/server/verifyAuth'
import { enforceIpRateLimit } from '@/lib/server/rateLimit'

interface RemoveStudentBody {
  studentUid?: string
  inviteId?: string
}

export async function POST(request: Request): Promise<Response> {
  const ipLimited = await enforceIpRateLimit(request)
  if (ipLimited) return ipLimited

  const auth = await verifyAuth(request)
  if (!auth.ok) return auth.response

  let body: RemoveStudentBody
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const db = getAdminFirestore()
  const inviteId = body.inviteId ?? (body.studentUid?.startsWith('pending:') ? body.studentUid.slice('pending:'.length) : undefined)

  if (inviteId) {
    const inviteRef = db.collection('studentInvites').doc(inviteId)
    const inviteSnap = await inviteRef.get()
    const invite = inviteSnap.data()
    if (!inviteSnap.exists || invite?.teacherUid !== auth.tutorUid) {
      return Response.json({ error: 'Invitation not found' }, { status: 404 })
    }

    const matchingInvites = await db.collection('studentInvites')
      .where('teacherUid', '==', auth.tutorUid)
      .get()
    const batch = db.batch()
    matchingInvites.docs.forEach((doc) => {
      const data = doc.data()
      if (data.email === invite.email && ['pending', 'sent', 'email_failed'].includes(String(data.status))) {
        batch.delete(doc.ref)
      }
    })
    const studentUid = typeof invite.studentUid === 'string' ? invite.studentUid : null
    if (studentUid) {
      const rosterRef = db.collection('teachers').doc(auth.tutorUid).collection('students').doc(studentUid)
      const studentRef = db.collection('students').doc(studentUid)
      const [rosterSnap, studentSnap] = await Promise.all([rosterRef.get(), studentRef.get()])
      if (rosterSnap.exists && rosterSnap.data()?.inviteStatus !== 'accepted') batch.delete(rosterRef)
      if (studentSnap.exists && studentSnap.data()?.teacherId === auth.tutorUid && studentSnap.data()?.inviteAcceptedAt == null) {
        batch.update(studentRef, { teacherId: null })
      }
    }
    await batch.commit()
    return Response.json({ success: true })
  }

  const { studentUid } = body
  if (!studentUid) {
    return Response.json({ error: 'studentUid or inviteId is required' }, { status: 400 })
  }

  const denied = await assertTutorOwnsStudent(auth.tutorUid, studentUid)
  if (denied) return denied

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
