import type { Metadata } from 'next'
import Link from 'next/link'
import { Mail, QrCode, Sparkles, TrendingUp } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Verbly — Private Beta',
  description: 'Verbly is currently in private testing.',
}

const features = [
  { icon: QrCode, title: 'Tutor Dashboard', description: 'Centralized tools to manage students, assignments, and lesson plans efficiently.' },
  { icon: Sparkles, title: 'AI-Powered Insights', description: 'Smart insights that help pinpoint language patterns and accelerate fluency.' },
  { icon: TrendingUp, title: 'Student Progress Tracking', description: 'Clear milestones that keep learners motivated and on track.' },
]

export default function PrivateBetaPage() {
  return (
    <div className="flex h-[calc(100dvh-53px)] flex-col overflow-hidden bg-[#090a0b] text-white">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/[0.06] bg-[#121313] px-7 md:px-12">
        <Link href="/private-beta" className="text-2xl font-semibold tracking-tight">Verbly</Link>
        <Link href="/login" className="text-sm font-semibold text-[#8DCEF9] transition-opacity hover:opacity-75">Sign In</Link>
      </header>

      <main className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col items-center overflow-hidden px-6 py-7 text-center md:py-8">
        <div className="rounded-full border border-white/10 bg-white/[0.08] px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-[#c8cbd0]"><span className="mr-2 inline-block h-2 w-2 rounded-full bg-[#8DCEF9]" />Private beta</div>
        <h1 className="mt-7 max-w-4xl font-heading text-4xl font-semibold leading-[0.98] tracking-[-0.055em] text-[#f5f5f5] md:text-6xl">The future of language<br className="hidden md:block" /> coaching is almost here.</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-[#b4b7bc] md:text-base">Verbly is currently in private testing. We&apos;re building a more precise, data-driven way for tutors to manage students and accelerate fluency.</p>
        <div className="mt-6 flex w-full max-w-lg flex-col gap-3 sm:flex-row">
          <div className="flex h-12 flex-1 items-center gap-3 rounded-xl border border-white/[0.08] bg-[#171819] px-4 text-left text-[#777c85]"><Mail className="size-5 shrink-0" /><span className="text-sm">Enter your email address</span></div>
          <a href="mailto:verblysupport@gmail.com?subject=Verbly%20waitlist" className="flex h-12 items-center justify-center rounded-xl bg-[#438bb7] px-6 text-sm font-semibold transition-colors hover:bg-[#4d9bc9]">Join the Waitlist</a>
        </div>
        <p className="mt-4 text-xs font-semibold text-[#858a91]">Be the first to know when we open to the public.</p>
        <div className="mt-8 grid w-full grid-cols-3 gap-2 text-left md:gap-4">
          {features.map(({ icon: Icon, title, description }) => (
            <div key={title} className="rounded-xl border border-white/[0.08] bg-[#121313] p-3 md:p-5"><div className="flex size-9 items-center justify-center rounded-lg bg-[#1d2a33] text-[#8DCEF9]"><Icon className="size-4" /></div><h2 className="mt-3 text-xs font-semibold text-[#f0f0f0] md:mt-4 md:text-base">{title}</h2><p className="mt-2 text-[10px] leading-4 text-[#b5b8bd] md:text-xs md:leading-5">{description}</p></div>
          ))}
        </div>
      </main>
    </div>
  )
}
