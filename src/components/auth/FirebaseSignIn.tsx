'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import * as firebaseui from 'firebaseui'
import 'firebaseui/dist/firebaseui.css'
import './firebaseui-dark.css'
import { onAuthStateChanged } from 'firebase/auth'
import { clientAuth, compatAuth } from '@/lib/firebase/client'
import type firebase from 'firebase/compat/app'

const BASE_UI_CONFIG: Omit<firebaseui.auth.Config, 'callbacks'> = {
  signInOptions: [
    {
      provider: 'google.com',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fullLabel: 'Continue with Google',
      customParameters: { prompt: 'select_account' },
    } as any,
  ],
  signInFlow: 'popup',
}

export default function FirebaseSignIn() {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(clientAuth, (user) => {
      // User exists, !null --> Send to '/'. Only rendered on unprotected routes (i.e., login)
      if (user) router.replace('/')
    })
    return unsubscribe
  }, [router])

  useEffect(() => {
    if (!containerRef.current) return

    const ui =
      firebaseui.auth.AuthUI.getInstance() ??
      new firebaseui.auth.AuthUI(compatAuth)

    ui.start(containerRef.current, {
      ...BASE_UI_CONFIG,
      callbacks: {
        signInSuccessWithAuthResult: (authResult) => {
          const user = authResult.user as firebase.User
          setLoading(true)
          user.getIdToken().then(async (idToken) => {
            try {
              const res = await fetch('/api/auth/bootstrap', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken }),
              })
              if (!res.ok) {
                const text = await res.text()
                let message = 'Something went wrong. Please try again.'
                try {
                  const data = JSON.parse(text)
                  message = data.error ?? message
                } catch {
                  message = text || message
                }
                setError(message)
                setLoading(false)
                return
              }
              router.push('/')
            } catch {
              setError('Could not reach the server. Please try again.')
              setLoading(false)
            }
          })
          return false
        },
      },
    })

    return () => {
      ui.reset()
    }
  }, [router])

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2.5 h-[52px] w-full rounded-full bg-[#1E1E1E] border border-[#2E2E2E]">
        <svg className="animate-spin w-4 h-4 text-[#8DCEF9]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span className="text-sm text-white font-medium">Signing in…</span>
      </div>
    )
  }

  return (
    <div className="w-full flex flex-col gap-3">
      {error && (
        <p className="text-center text-xs text-red-400">{error}</p>
      )}
      <div ref={containerRef} />
    </div>
  )
}
