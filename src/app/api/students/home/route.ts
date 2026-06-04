import type { Timestamp } from 'firebase-admin/firestore'

import { getAdminFirestore } from '@/lib/firebase/admin'
import { verifyAuth } from '@/lib/server/verifyAuth'

export async function GET(request: Request): Promise<Response> {
  const auth = await verifyAuth(request)
  if (!auth.ok) return auth.response

  const db = getAdminFirestore()

  const studentsSnap = await db
    .collection('teachers')
    .doc(auth.tutorUid)
    .collection('students')
    .get()

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const students = await Promise.all(
    studentsSnap.docs.map(async (doc) => {
      const { name, email } = doc.data()
      const studentUid = doc.id

      const [vocabDoc, cardsSnap] = await Promise.all([
        db.collection('student_vocab').doc(studentUid).get(),
        db
          .collection('student_vocab')
          .doc(studentUid)
          .collection('cards')
          .where('lastReview', '>=', weekAgo)
          .get(),
      ])

      const lastActiveTx = vocabDoc.data()?.lastActiveAt as Timestamp | undefined
      const lastActiveAt = lastActiveTx?.toDate().toISOString() ?? null

      return { uid: studentUid, name, email, wordsThisWeek: cardsSnap.size, lastActiveAt }
    }),
  )

  students.sort((a, b) => {
    if (a.lastActiveAt === b.lastActiveAt) return 0
    if (!a.lastActiveAt) return 1
    if (!b.lastActiveAt) return -1
    return a.lastActiveAt > b.lastActiveAt ? -1 : 1
  })

  return Response.json({ students })
}
