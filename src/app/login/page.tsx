import type { Metadata } from 'next'
import Link from 'next/link'
import FirebaseSignInLoader from '@/components/auth/FirebaseSignInLoader'

export const metadata: Metadata = {
  title: 'Log In — Verbly',
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#141414] flex flex-col items-center justify-center px-4">

      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-8">
        <svg width="28" height="28" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
          <path d="M18 8L16.75 5.25L14 4L16.75 2.75L18 0L19.25 2.75L22 4L19.25 5.25L18 8ZM18 22L16.75 19.25L14 18L16.75 16.75L18 14L19.25 16.75L22 18L19.25 19.25L18 22ZM8 19L5.5 13.5L0 11L5.5 8.5L8 3L10.5 8.5L16 11L10.5 13.5L8 19ZM8 14.15L9 12L11.15 11L9 10L8 7.85L7 10L4.85 11L7 12L8 14.15Z" fill="#8DCEF9" />
        </svg>
        <span className="text-white font-semibold text-xl tracking-tight">Verbly</span>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl px-8 py-10 flex flex-col items-center gap-7">
        <div className="text-center space-y-1.5">
          <h1 className="text-2xl font-bold text-white tracking-tight">Welcome back!</h1>
          <p className="text-sm text-[#808080]">Log in to your Verbly account to continue</p>
        </div>

        <div className="w-full">
          <FirebaseSignInLoader />
        </div>
      </div>

      {/* Below card */}
      <p className="mt-6 text-sm text-[#606060]">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="text-[#8DCEF9] hover:opacity-80 transition-opacity">
          Create one today!
        </Link>
      </p>
    </div>
  )
}
