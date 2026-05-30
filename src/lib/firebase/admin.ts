// Server-only — this module must never be imported in client components.
import 'server-only'

import { getApps, initializeApp, cert, getApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

function getAdminApp() {
  if (getApps().length > 0) return getApp()
  return initializeApp({
    credential: cert({
      projectId:   process.env.FIREBASE_ADMIN_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL!,
      // .env files encode PEM newlines as literal \n — must unescape
      privateKey:  (process.env.FIREBASE_ADMIN_PRIVATE_KEY ?? '').replace(/\\n/g, '\n'),
    }),
  })
}

// Lazy getters — initialization is deferred until first request, not build time
export function getAdminAuth() {
  return getAuth(getAdminApp())
}

export function getAdminFirestore() {
  return getFirestore(getAdminApp())
}
