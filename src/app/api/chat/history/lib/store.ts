import type {
  CollectionReference,
  DocumentSnapshot,
  Timestamp,
} from 'firebase-admin/firestore'

import { getAdminFirestore } from '@/lib/firebase/admin'
import type { ChatSummary } from '@/types/chat'

/** Saved chat threads live under the tutor, alongside their roster. */
export function chatsCollection(tutorUid: string): CollectionReference {
  return getAdminFirestore().collection('teachers').doc(tutorUid).collection('chats')
}

export function toChatSummary(doc: DocumentSnapshot): ChatSummary {
  const data = doc.data() ?? {}
  return {
    id: doc.id,
    title: (data.title as string | undefined) ?? 'New chat',
    studentUid: (data.studentUid as string | undefined) ?? '',
    studentName: (data.studentName as string | undefined) ?? '',
    updatedAt: (data.updatedAt as Timestamp | undefined)?.toDate().toISOString() ?? null,
  }
}
