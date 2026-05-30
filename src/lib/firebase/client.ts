// Browser-only — never import this in server components or API routes.

import { getApps, initializeApp } from 'firebase/app'
import compatApp from 'firebase/compat/app'
import 'firebase/compat/auth'

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
}

// Guard both SDKs against duplicate initialization (HMR / StrictMode)
if (!getApps().length) {
  initializeApp(firebaseConfig)
}
if (!compatApp.apps.length) {
  compatApp.initializeApp(firebaseConfig)
}

export const compatAuth = compatApp.auth()
