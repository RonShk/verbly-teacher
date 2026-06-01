import { getAdminFirestore } from '@/lib/firebase/admin'

/** Returns a 403 Response if the student is not on the tutor's roster; otherwise null. */
export async function assertTutorOwnsStudent(tutorUid: string, studentUid: string,): Promise<Response | null> {
  const rosterRef = getAdminFirestore()
    .collection('teachers')
    .doc(tutorUid)
    .collection('students')
    .doc(studentUid)

  const snap = await rosterRef.get()
  if (!snap.exists) {
    return Response.json({ error: 'Student not on your roster' }, { status: 403 })
  }

  const removedAt = snap.data()?.removedAt
  if (removedAt != null) {
    return Response.json({ error: 'Student not on your roster' }, { status: 403 })
  }

  return null
}
