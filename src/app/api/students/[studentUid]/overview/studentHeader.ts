import type { DocumentData, Timestamp } from 'firebase-admin/firestore'

import { getAdminFirestore } from '@/lib/firebase/admin'
import type { StudentOverviewStudent } from '@/types/student-overview'

export interface StudentHeaderInputs {
  tutorStudentDocument: DocumentData | undefined
  latestCompletedAt: Date | null
}

function toIso(ts: Timestamp | undefined): string | null {
  if (!ts) return null
  return ts.toDate().toISOString()
}

/** Fetches Firestore data for the student profile header (name, email, linked, last active). */
export async function fetchStudentHeaderInputs(tutorUid: string, studentUid: string): Promise<StudentHeaderInputs> {
  const db = getAdminFirestore()

  const tutorStudentDocumentRef = db
    .collection('teachers')
    .doc(tutorUid)
    .collection('students')
    .doc(studentUid)

  const [tutorStudentDocumentSnap, latestCompletedAssignmentSnap] = await Promise.all([
    tutorStudentDocumentRef.get(),
    db
      .collection('user_assignments')
      .where('userId', '==', studentUid)
      .orderBy('completedAt', 'desc')
      .limit(1)
      .get(),
  ])

  const latestCompleted = latestCompletedAssignmentSnap.docs[0]?.data()?.completedAt as | Timestamp | undefined

  return {
    tutorStudentDocument: tutorStudentDocumentSnap.data(),
    latestCompletedAt: latestCompleted?.toDate() ?? null,
  }
}

export function buildStudentHeader(inputs: StudentHeaderInputs, studentUid: string, vocabTotal: number, lastReviewAt: Date | null): StudentOverviewStudent {
  let lastActiveAt: Date | null = lastReviewAt
  if (inputs.latestCompletedAt && (!lastActiveAt || inputs.latestCompletedAt > lastActiveAt)) {
    lastActiveAt = inputs.latestCompletedAt
  }

  const doc = inputs.tutorStudentDocument

  return {
    uid: studentUid,
    name: (doc?.name as string | undefined) ?? '',
    email: (doc?.email as string | undefined) ?? '',
    linkedAt: toIso(doc?.signUpDate as Timestamp | undefined),
    lastActiveAt: lastActiveAt?.toISOString() ?? null,
    vocabTotal,
  }
}
