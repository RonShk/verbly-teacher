'use client'

import { FormEvent, useState } from 'react'
import { Check, Mail } from 'lucide-react'

export default function WaitlistForm() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    setSubmitting(true)

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        setMessage(result.error || 'Something went wrong. Please try again.')
        return
      }

      setEmail('')
      setSubmitted(true)
    } catch {
      setMessage('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="w-full max-w-lg rounded-2xl border border-white/[0.08] bg-[#121313] px-6 py-4 text-center shadow-2xl shadow-black/20 md:px-8 md:py-5">
        <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-[#173a26] text-[#7be29a]">
          <Check className="size-5" strokeWidth={2.5} />
        </div>
        <h2 className="mt-3 text-xl font-semibold tracking-[-0.03em] text-white">You&apos;re on the list!</h2>
        <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-[#b4b7bc]">We&apos;ll email you when Verbly opens to the public.</p>
        <button type="button" onClick={() => setSubmitted(false)} className="mt-2 text-[11px] font-semibold text-[#8DCEF9] transition-opacity hover:opacity-75">Add another email</button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-lg">
      <div className="flex w-full flex-col gap-3 sm:flex-row">
        <label className="flex h-12 flex-1 items-center gap-3 rounded-xl border border-white/[0.08] bg-[#171819] px-4 text-left text-[#777c85] focus-within:border-[#438bb7]">
          <Mail className="size-5 shrink-0" />
          <span className="sr-only">Email address</span>
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Enter your email address"
            autoComplete="email"
            className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-[#777c85]"
          />
        </label>
        <button
          type="submit"
          disabled={submitting}
          className="flex h-12 w-full shrink-0 items-center justify-center rounded-xl bg-[#438bb7] px-6 text-sm font-semibold transition-colors hover:bg-[#4d9bc9] disabled:cursor-not-allowed disabled:opacity-60 sm:w-48"
        >
          {submitting ? 'Joining…' : 'Join the Waitlist'}
        </button>
      </div>
      <p className="mt-3 text-left text-[11px] leading-4 text-[#858a91] sm:text-center">
        By joining, you agree to receive Verbly launch updates. You can unsubscribe at any time.
      </p>
      {message && <p role="status" className="mt-3 text-sm font-medium text-[#8DCEF9]">{message}</p>}
    </form>
  )
}
