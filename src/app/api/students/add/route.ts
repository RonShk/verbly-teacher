import { randomBytes } from 'node:crypto'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase/admin'
import { verifyAuth } from '@/lib/server/verifyAuth'
import { enforceIpRateLimit } from '@/lib/server/rateLimit'
import { sendStudentInviteEmail } from '@/lib/server/studentInviteEmail'

interface AddStudentBody {
  studentEmail: string
}

const INVITE_EXPIRY_DAYS = 30

export async function POST(request: Request): Promise<Response> {
  const ipLimited = await enforceIpRateLimit(request)
  if (ipLimited) return ipLimited

  const auth = await verifyAuth(request)
  if (!auth.ok) return auth.response

  let body: AddStudentBody
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { studentEmail } = body
  const normalizedEmail = studentEmail?.trim().toLowerCase()
  if (!normalizedEmail || normalizedEmail.length > 320) {
    return Response.json({ error: 'studentEmail is required' }, { status: 400 })
  }

  const teacherUid = auth.tutorUid
  const db = getAdminFirestore()
  const existingInvites = await db.collection('studentInvites')
    .where('teacherUid', '==', teacherUid)
    .get()
  const alreadyInvited = existingInvites.docs.some((doc) => {
    const invite = doc.data()
    return typeof invite.email === 'string' &&
      invite.email.trim().toLowerCase() === normalizedEmail &&
      ['pending', 'sent'].includes(String(invite.status))
  })
  if (alreadyInvited) {
    return Response.json({ error: 'already_added' }, { status: 409 })
  }

  if (!process.env.RESEND_API_KEY?.trim() || !process.env.RESEND_FROM_EMAIL?.trim()) {
    return Response.json({ error: 'Invitations are not configured yet' }, { status: 503 })
  }

  let studentUid: string | null = null
  let studentName: string
  let resolvedEmail: string
  let signUpDate: Date
  try {
    const studentUser = await getAdminAuth().getUserByEmail(normalizedEmail)
    studentUid = studentUser.uid
    studentName = studentUser.displayName ?? normalizedEmail
    resolvedEmail = studentUser.email ?? normalizedEmail
    signUpDate = new Date(studentUser.metadata.creationTime)
  } catch (err: unknown) {
    const code = (err as { code?: string }).code
    if (code === 'auth/user-not-found') {
      studentName = normalizedEmail
      resolvedEmail = normalizedEmail
    } else {
      console.error('Auth lookup failed:', err)
      return Response.json({ error: 'Internal server error' }, { status: 500 })
    }
  }

  const studentDocRef = studentUid ? db.collection('students').doc(studentUid) : null
  const rosterRef = studentUid
    ? db.collection('teachers').doc(teacherUid).collection('students').doc(studentUid)
    : null

  const inviteRef = db.collection('studentInvites').doc(randomBytes(16).toString('hex'))
  const expiresAt = Timestamp.fromMillis(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000)

  const [teacherUser, studentSnap, existingRoster] = await Promise.all([
    getAdminAuth().getUser(teacherUid),
    studentDocRef?.get() ?? Promise.resolve(null),
    rosterRef?.get() ?? Promise.resolve(null),
  ])
  const canRetryFailedInvite = existingRoster?.exists && existingRoster.data()?.inviteStatus === 'email_failed'
  if (existingRoster?.exists && !canRetryFailedInvite) {
    return Response.json({ error: 'already_added' }, { status: 409 })
  }
  const currentTeacherId = studentSnap?.data()?.teacherId as string | null | undefined
  if (currentTeacherId && currentTeacherId !== teacherUid) {
    return Response.json({ error: 'already_linked' }, { status: 409 })
  }

  const tutorName = teacherUser.displayName?.trim() || teacherUser.email || 'Your tutor'
  await db.runTransaction(async (transaction) => {
    transaction.create(inviteRef, {
      teacherUid,
      studentUid,
      email: resolvedEmail,
      status: 'pending',
      createdAt: FieldValue.serverTimestamp(),
      expiresAt,
    })
    if (studentUid) {
      transaction.set(rosterRef!, {
        name: studentName,
        email: resolvedEmail,
        signUpDate,
        inviteStatus: 'pending',
        inviteCreatedAt: FieldValue.serverTimestamp(),
      })
    }
  })

  try {
    const emailId = await sendStudentInviteEmail({
      recipientEmail: resolvedEmail,
      recipientName: studentName === resolvedEmail ? 'there' : studentName,
      tutorName,
      expiresInDays: INVITE_EXPIRY_DAYS,
    })
    await inviteRef.update({ status: 'sent', emailId, sentAt: FieldValue.serverTimestamp() })
    if (rosterRef) await rosterRef.update({ inviteStatus: 'sent' })
  } catch (error) {
    console.error('[student invite] email failed:', error)
    await inviteRef.update({ status: 'email_failed', emailError: 'delivery_failed' }).catch(() => undefined)
    if (rosterRef) await rosterRef.update({ inviteStatus: 'email_failed' }).catch(() => undefined)
    return Response.json({ error: 'Could not send the student invitation email' }, { status: 502 })
  }

  return Response.json({
    student: studentUid ? { uid: studentUid, name: studentName, email: resolvedEmail } : null,
    invitation: { id: inviteRef.id, status: 'sent', email: resolvedEmail },
  })
}
