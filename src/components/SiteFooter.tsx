'use client'

import { usePathname } from 'next/navigation'
import Footer from './Footer'

// /chat is a full-viewport app shell with its own chrome — no site footer there.
export function SiteFooter() {
  const pathname = usePathname()
  if (pathname === '/chat') return null
  return <Footer />
}
