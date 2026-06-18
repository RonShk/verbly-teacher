'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useSelectedLayoutSegment } from 'next/navigation'
import {
  ArrowLeft,
  Zap,
  Plus,
  Download,
  ShieldOff,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { clientAuth } from '@/lib/firebase/client'
import type { StudentOverviewResponse } from '@/types/student-overview'
import { StudentOverviewContext } from './student-context'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const AVATAR_COLORS = [
  'bg-purple-500', 'bg-blue-500', 'bg-pink-500', 'bg-teal-500',
  'bg-orange-500', 'bg-slate-500', 'bg-indigo-500', 'bg-emerald-500',
]

function deriveInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function deriveColor(uid: string): string {
  let hash = 0
  for (let i = 0; i < uid.length; i++) hash = (hash * 31 + uid.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

function formatLinkedDate(isoString: string | null): string {
  if (!isoString) return 'Unknown'
  return new Date(isoString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatLastActive(isoString: string | null): string {
  if (!isoString) return 'Never'
  const diff = Date.now() - new Date(isoString).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days === 1) return 'Yesterday'
  return `${days}d ago`
}

// ---------------------------------------------------------------------------
// Tab definitions
// null segment = index route (/students/[uid])
// ---------------------------------------------------------------------------

const TABS = [
  { segment: null,         label: 'Overview',    path: '' },
  { segment: 'vocabulary', label: 'Vocabulary',  path: '/vocabulary' },
  { segment: 'progress',   label: 'Progress',    path: '/progress' },
] as const

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const params = useParams()
  const studentUid = params.studentUid as string
  const segment = useSelectedLayoutSegment()

  const [overview, setOverview] = useState<StudentOverviewResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<{ status: number; message: string } | null>(null)

  useEffect(() => {
    const user = clientAuth.currentUser
    if (!user) return
    user.getIdToken().then((token) => {
      const tz = -(new Date().getTimezoneOffset())
      return fetch(
        `/api/students/${studentUid}/overview?timezoneOffsetMinutes=${tz}`,
        { headers: { Authorization: `Bearer ${token}` } },
      )
    }).then(async (r) => {
      if (!r.ok) {
        const body = await r.json().catch(() => ({}))
        setError({ status: r.status, message: body.error ?? `Error ${r.status}` })
        return
      }
      setOverview(await r.json())
    }).catch(() => {
      setError({ status: 0, message: 'Network error — please try again.' })
    }).finally(() => setLoading(false))
  }, [studentUid])

  const student = overview?.student
  const firstName = student?.name.split(' ')[0] ?? ''
  const initials = student ? deriveInitials(student.name) : '…'
  const avatarColor = student ? deriveColor(student.uid) : 'bg-slate-500'

  if (!loading && error) {
    const is403 = error.status === 403
    return (
      <div className="flex min-h-screen flex-col">
        <div className="px-8 pt-6">
          <Link
            href="/students"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Students
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center px-8">
          <Card className="w-full max-w-sm border-border bg-card">
            <CardContent className="flex flex-col items-center gap-4 px-8 py-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.04]">
                {is403
                  ? <ShieldOff className="h-5 w-5 text-muted-foreground" />
                  : <AlertTriangle className="h-5 w-5 text-muted-foreground" />
                }
              </div>
              <div className="flex flex-col gap-1.5">
                <p className="text-lg font-semibold font-heading text-foreground">
                  {is403 ? 'Student not on your roster' : 'Something went wrong'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {is403
                    ? 'Double-check your roster or ask the student to re-link their account.'
                    : error.message}
                </p>
              </div>
              <Link href="/students">
                <Button className="mt-1 border border-border bg-transparent font-medium text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to Students
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <StudentOverviewContext.Provider value={{ overview, loading, error }}>
      <div className="flex flex-col gap-0">
        {/* Back link */}
        <div className="px-8 pt-6">
          <Link
            href="/students"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Students
          </Link>
        </div>

        {/* Student header */}
        <div className="flex items-start justify-between px-8 pt-5">
          <div className="flex items-start gap-4">
            <div
              className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-xl ${avatarColor} text-lg font-semibold text-white`}
            >
              {initials}
            </div>
            <div className="flex flex-col gap-1.5">
              <h1 className="text-2xl font-bold font-heading text-foreground">
                {loading ? <span className="opacity-40">Loading…</span> : (student?.name ?? '—')}
              </h1>
              <p className="text-sm text-muted-foreground">
                {student?.email ?? ''}
                {student?.linkedAt && (
                  <>
                    <span className="mx-2 opacity-40">•</span>
                    Linked {formatLinkedDate(student.linkedAt)}
                  </>
                )}
              </p>
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-border bg-card px-2.5 py-0.5 text-xs text-muted-foreground">
                  Last active {formatLastActive(student?.lastActiveAt ?? null)}
                </span>
                <span className="rounded-full border border-border bg-card px-2.5 py-0.5 text-xs text-muted-foreground">
                  {student?.vocabTotal ?? '—'} words
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Button className="bg-[#8DCEF9] font-medium text-[#0a1a2a] hover:bg-[#A8DAFC]">
              <Zap className="h-3.5 w-3.5" />
              {firstName ? `Ask about ${firstName}` : 'Ask Verbly'}
            </Button>
            <Button className="border border-[rgba(141,206,249,0.3)] bg-transparent font-medium text-[#C8E8FC] hover:border-[rgba(141,206,249,0.5)] hover:bg-[rgba(141,206,249,0.05)]">
              <Plus className="h-3.5 w-3.5" />
              Add words
            </Button>
            <Button className="border border-[rgba(255,255,255,0.08)] bg-[#1e1e1e] font-medium text-[#999] hover:bg-[#252525] hover:text-foreground">
              <Download className="h-3.5 w-3.5" />
              Import
            </Button>
          </div>
        </div>

        {/* Tab nav */}
        <div className="mt-6 border-b border-border px-8">
          <nav className="flex gap-6">
            {TABS.map((tab) => {
              const isActive = segment === tab.segment
              return (
                <Link
                  key={tab.label}
                  href={`/students/${studentUid}${tab.path}`}
                  className={[
                    'border-b-2 pb-3 text-sm font-medium uppercase tracking-wider transition-colors',
                    isActive
                      ? 'border-[#8DCEF9] text-[#8DCEF9]'
                      : 'border-transparent text-muted-foreground hover:text-foreground',
                  ].join(' ')}
                >
                  {tab.label}
                </Link>
              )
            })}
          </nav>
        </div>

        {children}
      </div>
    </StudentOverviewContext.Provider>
  )
}
