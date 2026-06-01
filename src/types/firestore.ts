export interface TeacherDoc {
  uid: string
  displayName: string
  email: string
  createdAt: Date | { toDate(): Date }
  photoURL?: string
}

export interface StudentRosterEntry {
  uid: string
  name: string
  email: string
  signUpDate: Date | { toDate(): Date }
}
