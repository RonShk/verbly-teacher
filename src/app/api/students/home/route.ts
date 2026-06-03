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

      const cardsSnap = await db
        .collection('student_vocab')
        .doc(studentUid)
        .collection('cards')
        .get()

      let wordsThisWeek = 0
      let lastActiveAt: string | null = null

      for (const card of cardsSnap.docs) {
        const ts = card.data().lastReview as Timestamp | undefined
        if (!ts) continue
        const reviewed = ts.toDate()
        if (reviewed >= weekAgo) wordsThisWeek++
        const iso = reviewed.toISOString()
        if (!lastActiveAt || iso > lastActiveAt) lastActiveAt = iso
      }

      return { uid: studentUid, name, email, wordsThisWeek, lastActiveAt }
    }),
  )

  students.sort((a, b) => b.wordsThisWeek - a.wordsThisWeek)

  return Response.json({ students })
}
