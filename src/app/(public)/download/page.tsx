import type { Metadata } from 'next'
import { ArrowRight, Check, Smartphone } from 'lucide-react'

import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'Download Verbly — Verbly',
  description: 'Download Verbly and start practicing with your tutor.',
}

function StoreButton({
  href,
  platform,
}: {
  href?: string
  platform: 'apple' | 'google'
}) {
  const available = Boolean(href)
  const label = platform === 'apple' ? 'App Store' : 'Google Play'

  if (!available) {
    return (
      <div className="flex min-h-16 items-center gap-3 rounded-xl border border-border bg-[#1e1e1e] px-4 opacity-65">
        <StoreMark platform={platform} />
        <div>
          <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Coming soon</p>
          <p className="font-medium text-foreground">{label}</p>
        </div>
      </div>
    )
  }

  return (
    <Button asChild variant="outline" className="h-16 justify-start gap-3 rounded-xl border-border bg-[#1e1e1e] px-4 text-left hover:bg-[#252525]">
      <a href={href} target="_blank" rel="noreferrer">
        <StoreMark platform={platform} />
        <span className="flex flex-1 flex-col">
          <span className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Download on</span>
          <span className="font-medium text-foreground">{label}</span>
        </span>
        <ArrowRight className="size-4 text-muted-foreground" />
      </a>
    </Button>
  )
}

function StoreMark({ platform }: { platform: 'apple' | 'google' }) {
  return (
    <span className="flex size-9 items-center justify-center rounded-lg bg-[#8DCEF9]/10 text-[#8DCEF9]" aria-hidden="true">
      {platform === 'apple' ? <span className="text-xl leading-none">●</span> : <span className="text-lg leading-none">▶</span>}
    </span>
  )
}

export default function DownloadPage() {
  const appStoreUrl = process.env.VERBLY_IOS_APP_STORE_URL?.trim()
  const googlePlayUrl = process.env.VERBLY_ANDROID_PLAY_STORE_URL?.trim()

  return (
    <main className="flex flex-1 items-center overflow-hidden px-6 py-14 md:px-10 md:py-20">
      <div className="mx-auto grid w-full max-w-5xl items-center gap-14 lg:grid-cols-[1.05fr_.95fr] lg:gap-20">
        <section>
          <div className="mb-7 flex size-16 items-center justify-center rounded-2xl bg-[#8DCEF9]/10 text-[#8DCEF9] ring-1 ring-[#8DCEF9]/20">
            <Smartphone className="size-7" />
          </div>
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-[#8DCEF9]">Practice anywhere</p>
          <h1 className="max-w-xl font-heading text-4xl font-semibold tracking-[-0.04em] text-foreground md:text-6xl">Your language practice, in your pocket.</h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-muted-foreground md:text-lg">Download Verbly to practice the vocabulary your tutor has chosen, build a habit, and see your progress grow one session at a time.</p>
          <div className="mt-8 grid max-w-md gap-3 sm:grid-cols-2">
            <StoreButton href={appStoreUrl} platform="apple" />
            <StoreButton href={googlePlayUrl} platform="google" />
          </div>
          <p className="mt-4 text-xs text-muted-foreground">Already received an invitation? Sign in to the app with the exact email address the invitation was sent to.</p>
        </section>

        <section className="relative mx-auto w-full max-w-sm">
          <div className="absolute -inset-8 rounded-[3rem] bg-[#8DCEF9]/5 blur-3xl" aria-hidden="true" />
          <div className="relative rounded-[2rem] border border-border bg-card p-5 shadow-2xl shadow-black/30">
            <div className="rounded-[1.5rem] bg-[#0d202e] p-7 ring-1 ring-[#27516c]">
              <div className="mb-12 flex items-center justify-between"><span className="font-heading text-lg font-semibold text-foreground">Verbly</span><span className="rounded-full bg-[#8DCEF9]/10 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.1em] text-[#8DCEF9]">Today</span></div>
              <p className="text-sm text-[#a8dafc]">Keep your streak going</p>
              <p className="mt-2 font-heading text-3xl font-semibold text-white">A little practice<br />goes a long way.</p>
              <div className="mt-10 flex items-center gap-3 rounded-xl bg-white/5 p-3"><div className="flex size-8 items-center justify-center rounded-full bg-[#8DCEF9] text-[#0a1a2a]"><Check className="size-4" /></div><span className="text-sm text-white/80">Ready for today’s session</span></div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
