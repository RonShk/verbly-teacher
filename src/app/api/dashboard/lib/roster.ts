import type { Timestamp } from 'firebase-admin/firestore'

import { getAdminFirestore } from '@/lib/firebase/admin'
import type { RosterStudent } from '@/types/dashboard'

import { timed } from './_timing'

/**
 * The tutor's students for the switcher dropdown, most recently active first.
 * One roster query plus one vocab-parent doc read per student (for lastActiveAt).
 */
export async function fetchRoster(tutorUid: string): Promise<RosterStudent[]> {
  const db = getAdminFirestore()

  const rosterSnap = await timed('  read rosterQuery', db.collection('teachers').doc(tutorUid).collection('students').get())

  const students = await timed('  read rosterVocabParents', Promise.all(
    rosterSnap.docs
      .filter((doc) => doc.data()?.removedAt == null)
      .map(async (doc) => {
        const { name, email } = doc.data()
        const vocabParent = await db.collection('student_vocab').doc(doc.id).get()
        const lastActiveAt = (vocabParent.data()?.lastActiveAt as Timestamp | undefined)?.toDate()
        return {
          uid: doc.id,
          name: (name as string | undefined) ?? '',
          email: (email as string | undefined) ?? '',
          lastActiveAt: lastActiveAt?.toISOString() ?? null,
        }
      }),
  ))

  students.sort((a, b) => {
    if (a.lastActiveAt === b.lastActiveAt) return 0
    if (!a.lastActiveAt) return 1
    if (!b.lastActiveAt) return -1
    return a.lastActiveAt > b.lastActiveAt ? -1 : 1
  })

  return students
}
