'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import type { User } from 'firebase/auth'
import { clientAuth } from '@/lib/firebase/client'

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    return onAuthStateChanged(clientAuth, (currentUser) => {
      setUser(currentUser)
      setLoading(false)
      if (!currentUser) router.replace('/login')
    })
  }, [router])

  if (loading || !user) return <div className="min-h-screen bg-[#141414]" />
  return <>{children}</>
}
