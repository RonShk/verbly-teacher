'use client'

// This thin client wrapper is required because next/dynamic with ssr:false
// must be called inside a Client Component boundary.
import dynamic from 'next/dynamic'

const FirebaseSignIn = dynamic(
  () => import('@/components/auth/FirebaseSignIn'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-10">
        <span className="text-xs text-zinc-500">Loading…</span>
      </div>
    ),
  }
)

export default function FirebaseSignInLoader() {
  return <FirebaseSignIn />
}
