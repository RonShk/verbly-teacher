import type { Metadata } from 'next'
import Link from 'next/link'
import FirebaseSignInLoader from '@/components/auth/FirebaseSignInLoader'

export const metadata: Metadata = {
  title: 'Tutor Sign In — Verbly',
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#141414] flex flex-col items-center justify-center px-4">
      <Link href="/private-beta" className="mb-8 text-2xl font-semibold tracking-tight text-white">Verbly</Link>
      <div className="w-full max-w-sm rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] px-8 py-10">
        <div className="mb-7 space-y-1.5 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-white">Tutor sign in</h1>
          <p className="text-sm text-[#808080]">Sign in with an approved tutor account.</p>
        </div>
        <FirebaseSignInLoader />
      </div>
      <Link href="/private-beta" className="mt-6 text-sm text-[#8DCEF9] hover:opacity-80">Back to private beta</Link>
    </div>
  )
}
