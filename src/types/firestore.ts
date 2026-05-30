export interface TeacherDoc {
  uid: string
  displayName: string
  email: string
  createdAt: Date | { toDate(): Date }
  photoURL?: string
}
