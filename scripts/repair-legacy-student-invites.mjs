import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { getApps, initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

function required(name) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is required`)
  return value
}

const app = getApps()[0] ?? initializeApp({
  credential: cert({
    projectId: required('FIREBASE_ADMIN_PROJECT_ID'),
    clientEmail: required('FIREBASE_ADMIN_CLIENT_EMAIL'),
    privateKey: required('FIREBASE_ADMIN_PRIVATE_KEY').replace(/\\n/g, '\n'),
  }),
})
const db = getFirestore(app)
const dryRun = process.argv.includes('--dry-run')

const snapshot = await db.collection('studentInvites').get()
let repaired = 0
let skipped = 0

for (const inviteDoc of snapshot.docs) {
  const invite = inviteDoc.data()
  const teacherUid = typeof invite.teacherUid === 'string' ? invite.teacherUid : null
  const studentUid = typeof invite.studentUid === 'string' ? invite.studentUid : null
  const accepted = invite.status === 'accepted' || invite.acceptedAt instanceof Timestamp

  if (!teacherUid || !studentUid || accepted) {
    skipped += 1
    continue
  }

  const studentRef = db.collection('students').doc(studentUid)
  const rosterRef = db.collection('teachers').doc(teacherUid).collection('students').doc(studentUid)

  const changed = await db.runTransaction(async (transaction) => {
    const [studentSnap, rosterSnap] = await Promise.all([
      transaction.get(studentRef),
      transaction.get(rosterRef),
    ])
    const student = studentSnap.data()
    if (!studentSnap.exists || student?.teacherId !== teacherUid) return false

    if (dryRun) return true

    transaction.update(studentRef, { teacherId: FieldValue.delete(), inviteAcceptedAt: FieldValue.delete() })
    if (rosterSnap.exists && rosterSnap.data()?.inviteAcceptedAt != null) {
      transaction.update(rosterRef, { inviteAcceptedAt: FieldValue.delete() })
    }
    return true
  })

  if (changed) repaired += 1
  else skipped += 1
}

console.log(`Legacy invite repair ${dryRun ? 'preview' : 'complete'}: ${dryRun ? 'would repair' : 'repaired'} ${repaired}, skipped ${skipped}.`)
