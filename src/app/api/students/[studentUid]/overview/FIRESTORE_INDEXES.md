# Firestore indexes for student overview

Deploy composite indexes in **vocab_forge** (`firestore.indexes.json`) when queries fail at runtime with an index URL.

## `user_assignments` (sentence practice overview)

Used by `sentence-practice/sentencePractice.ts` (`fetchSentencePracticeAssignments`):

- `userId` + `type` + `assignmentDate`

Already defined in vocab_forge `firestore.indexes.json` (collection group `user_assignments`).

## Student header (`student-header/studentHeader.ts`)

Latest sentence-practice completion for `lastActiveAt`:

- `user_assignments`: `userId` + `orderBy('completedAt', 'desc')` (index: `userId` + `completedAt` in vocab_forge)

Documents without `completedAt` (in-progress TODO rows) are excluded by Firestore when ordering on that field.
