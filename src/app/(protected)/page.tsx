'use client'

import { useRef, useState, useEffect } from 'react'
import Link from 'next/link'
import {
  UserPlus,
  Languages,
  BookOpen,
  Users,
  CirclePlus,
  TrendingUp,
  ArrowRight,
} from 'lucide-react'

import { clientAuth } from '@/lib/firebase/client'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

type ActivityItem =
  | { id: number; kind: 'session'; student: string; activity: string; score: number; scoreType: 'percent' | 'cards'; time: string }
  | { id: number; kind: 'add'; student: string; count: number; time: string }

const MOCK_ACTIVITIES: ActivityItem[] = [
  { id: 1, kind: 'session', student: 'Maria Lopez', activity: 'Translation', score: 88, scoreType: 'percent', time: '2h ago' },
  { id: 2, kind: 'session', student: 'Alex Rivera', activity: 'VOCAB', score: 15, scoreType: 'cards', time: '4h ago' },
  { id: 3, kind: 'session', student: 'David Park', activity: 'Production', score: 71, scoreType: 'percent', time: 'Yesterday' },
  { id: 4, kind: 'add', student: 'Sofia Ruiz', count: 12, time: 'Yesterday' },
  { id: 5, kind: 'session', student: 'James Chen', activity: 'Production', score: 54, scoreType: 'percent', time: '2d ago' },
]

type DashboardStudent = { uid: string; name: string; wordsThisWeek: number; lastActiveAt: string | null }

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

function timeGreeting(): string {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatLastActive(iso: string | null): string {
  if (!iso) return 'Never'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days === 1) return 'Yesterday'
  return `${days}d ago`
}

function activityIcon(item: ActivityItem) {
  if (item.kind === 'add') return <CirclePlus className="h-4 w-4 text-[#8DCEF9]" />
  if (item.activity === 'Translation') return <Languages className="h-4 w-4 text-muted-foreground" />
  if (item.activity === 'VOCAB') return <BookOpen className="h-4 w-4 text-muted-foreground" />
  return <Users className="h-4 w-4 text-muted-foreground" />
}

function activityLabel(item: ActivityItem): string {
  if (item.kind === 'add') return `You added ${item.count} words for ${item.student}`
  return `${item.student} completed ${item.activity}`
}

function activityScore(item: ActivityItem) {
  if (item.kind === 'add') return null
  if (item.scoreType === 'cards') {
    return <span className="text-xs font-medium text-muted-foreground">{item.score} CARDS</span>
  }
  const color = item.score >= 70 ? 'text-[#61C796]' : item.score >= 50 ? 'text-[#F09F27]' : 'text-[#E24B4A]'
  return <span className={`text-sm font-semibold ${color}`}>{item.score}%</span>
}

// ---------------------------------------------------------------------------
// Add Student Dialog
// ---------------------------------------------------------------------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
type AddError = 'not_found' | 'already_added' | 'generic'
const ADD_ERROR_MESSAGES: Record<AddError, string> = {
  not_found: 'No student account found for this email. Double-check the spelling.',
  already_added: 'This student is already in your class.',
  generic: 'Something went wrong. Please try again.',
}
type SearchResult = { uid: string; name: string; email: string; signUpDate: string | null }

function AddStudentDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [email, setEmail] = useState('')
  const [touched, setTouched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState<AddError | null>(null)
  const [suggestions, setSuggestions] = useState<SearchResult[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const noResultsPrefixRef = useRef<string | null>(null)

  const isValid = EMAIL_RE.test(email)
  const showValidationError = touched && email.length > 0 && !isValid

  async function fetchSuggestions(query: string) {
    if (query.length < 4) { setSuggestions([]); setShowSuggestions(false); noResultsPrefixRef.current = null; return }
    if (noResultsPrefixRef.current && query.startsWith(noResultsPrefixRef.current)) return
    const currentUser = clientAuth.currentUser
    if (!currentUser) return
    const idToken = await currentUser.getIdToken()
    const res = await fetch(`/api/students/search?q=${encodeURIComponent(query)}`, { headers: { Authorization: `Bearer ${idToken}` } })
    if (!res.ok) return
    const { students } = await res.json()
    if (students.length === 0) { noResultsPrefixRef.current = query } else { noResultsPrefixRef.current = null }
    setSuggestions(students)
    setShowSuggestions(students.length > 0)
  }

  function handleEmailChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setEmail(val)
    if (apiError) setApiError(null)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 220)
  }

  function handleSelect(result: SearchResult) {
    setEmail(result.email)
    setSuggestions([])
    setShowSuggestions(false)
    setTouched(true)
    if (apiError) setApiError(null)
    noResultsPrefixRef.current = null
  }

  function handleClose() {
    setEmail(''); setTouched(false); setLoading(false); setApiError(null)
    setSuggestions([]); setShowSuggestions(false)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    noResultsPrefixRef.current = null
    onOpenChange(false)
  }

  async function handleAdd() {
    if (!isValid || loading) return
    setShowSuggestions(false); setLoading(true); setApiError(null)
    try {
      const currentUser = clientAuth.currentUser
      if (!currentUser) throw new Error('Not authenticated')
      const idToken = await currentUser.getIdToken()
      const res = await fetch('/api/students/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ studentEmail: email }),
      })
      if (res.ok) { handleClose(); return }
      if (res.status === 404) setApiError('not_found')
      else if (res.status === 409) setApiError('already_added')
      else setApiError('generic')
    } catch { setApiError('generic') }
    finally { setLoading(false) }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
      <DialogContent showCloseButton={false} className="gap-0 rounded-2xl p-0 sm:max-w-sm">
        <DialogHeader className="items-center px-6 pb-5 pt-8 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(141,206,249,0.1)]">
            <UserPlus className="h-5 w-5 text-[#8DCEF9]" />
          </div>
          <DialogTitle className="text-base font-semibold text-foreground">Invite a Student</DialogTitle>
          <DialogDescription className="mt-1.5 text-center text-sm text-muted-foreground">
            They&apos;ll receive an invite to join your class.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5 px-6 py-5">
          <label className="text-sm font-medium text-foreground">Student Email</label>
          <div className="relative">
            <Input
              type="email"
              placeholder="student@email.com"
              value={email}
              onChange={handleEmailChange}
              onBlur={() => { setTouched(true); setTimeout(() => setShowSuggestions(false), 150) }}
              onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true) }}
              aria-invalid={showValidationError || apiError === 'not_found'}
              disabled={loading}
            />
            {showSuggestions && (
              <ul className="absolute top-full z-50 mt-1 w-full overflow-hidden rounded-lg border border-border bg-popover shadow-lg">
                {suggestions.map((s) => (
                  <li key={s.uid}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleSelect(s)}
                      className="flex w-full flex-col px-3 py-2.5 text-left hover:bg-white/5"
                    >
                      <span className="text-sm font-medium text-foreground">{s.name}</span>
                      <span className="text-xs text-muted-foreground">{s.email}</span>
                      {s.signUpDate && (
                        <span className="mt-0.5 text-xs italic text-muted-foreground/60">
                          Joined Verbly on{' '}
                          {new Date(s.signUpDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {showValidationError && <p className="text-xs text-[#f09595]">Please enter a valid email address.</p>}
          {apiError && <p className="text-xs text-[#f09595]">{ADD_ERROR_MESSAGES[apiError]}</p>}
        </div>

        <DialogFooter className="flex-row gap-3 border-t border-border px-6 py-4 sm:flex-row sm:justify-stretch">
          <Button
            disabled={!isValid || loading}
            onClick={handleAdd}
            className="flex-1 rounded-xl bg-[#8DCEF9] font-medium text-[#0a1a2a] hover:bg-[#A8DAFC] disabled:opacity-30"
          >
            {loading ? 'Adding…' : 'Add student'}
          </Button>
          <Button
            onClick={handleClose}
            disabled={loading}
            className="flex-1 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#1e1e1e] text-[#c0c0c0] hover:bg-[#252525] hover:text-foreground"
          >
            Go back
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Home Page
// ---------------------------------------------------------------------------

export default function HomePage() {
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [students, setStudents] = useState<DashboardStudent[]>([])
  const [loadingStudents, setLoadingStudents] = useState(true)
  const [firstName, setFirstName] = useState('')

  useEffect(() => {
    const displayName = clientAuth.currentUser?.displayName ?? ''
    setFirstName(displayName.split(' ')[0])

    clientAuth.currentUser?.getIdToken().then((idToken) => {
      fetch('/api/students/home', { headers: { Authorization: `Bearer ${idToken}` } })
        .then((r) => r.json())
        .then(({ students: rows }: { students: DashboardStudent[] }) => setStudents(rows))
        .catch(() => {})
        .finally(() => setLoadingStudents(false))
    })
  }, [])

  return (
    <>
      <div className="flex flex-col gap-8 p-8">

        <div className="border-b border-border pb-8">
          <h1 className="font-heading text-2xl font-bold text-foreground">
            {timeGreeting()}{firstName ? `, ${firstName}` : ''}.
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Here&apos;s what your students have been up to.
          </p>

          <div className="mt-6 flex items-center gap-2.5">
            <Button asChild className="bg-[#8DCEF9] font-medium text-[#0a1a2a] hover:bg-[#A8DAFC]">
              <Link href="/chat">
                <svg width="14" height="14" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-1.5 shrink-0">
                  <path d="M18 8L16.75 5.25L14 4L16.75 2.75L18 0L19.25 2.75L22 4L19.25 5.25L18 8ZM18 22L16.75 19.25L14 18L16.75 16.75L18 14L19.25 16.75L22 18L19.25 19.25L18 22ZM8 19L5.5 13.5L0 11L5.5 8.5L8 3L10.5 8.5L16 11L10.5 13.5L8 19ZM8 14.15L9 12L11.15 11L9 10L8 7.85L7 10L4.85 11L7 12L8 14.15Z" fill="#0a1a2a"/>
                </svg>
                Ask Verbly
              </Link>
            </Button>
            <Button
              onClick={() => setAddDialogOpen(true)}
              className="border border-border bg-card text-muted-foreground hover:bg-[#1e1e1e] hover:text-foreground"
            >
              <UserPlus className="mr-1.5 h-3.5 w-3.5" />
              Add student
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-[2fr_3fr] gap-5">

          <div className="flex flex-col rounded-xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-heading text-base font-semibold text-foreground">Recent Activity</h2>
              <Link
                href="/recent-activity"
                className="flex items-center gap-1 text-xs font-medium text-[#8DCEF9] transition-colors hover:text-[#A8DAFC]"
              >
                View All
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="flex flex-col">
              {MOCK_ACTIVITIES.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-white/[0.05]"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1e1e1e]">
                    {activityIcon(item)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{activityLabel(item)}</p>
                    <p className="text-xs text-muted-foreground">{item.time}</p>
                  </div>
                  <div className="shrink-0">{activityScore(item)}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col rounded-xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center gap-3">
              <h2 className="font-heading text-base font-semibold text-foreground">Students</h2>
              <div className="flex items-center gap-1 rounded-full border border-border bg-[#1e1e1e] px-2 py-0.5">
                <TrendingUp className="h-2.5 w-2.5 text-[#8DCEF9]" />
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Most active</span>
              </div>
            </div>

            <div className="mb-1 grid grid-cols-[1fr_100px_130px] px-2">
              <span className="text-[11px] font-medium uppercase tracking-[0.07em] text-muted-foreground">Student</span>
              <span className="text-[11px] font-medium uppercase tracking-[0.07em] text-muted-foreground">Words this week</span>
              <span className="pl-6 text-[11px] font-medium uppercase tracking-[0.07em] text-muted-foreground">Last active</span>
            </div>

            <div className="flex flex-col">
              {loadingStudents ? (
                <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
              ) : students.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">No students yet.</div>
              ) : (
                students.slice(0, 5).map((s) => (
                  <Link
                    key={s.uid}
                    href={`/students/${s.uid}`}
                    className="grid grid-cols-[1fr_100px_130px] items-center rounded-lg px-2 py-3 transition-colors hover:bg-white/[0.05]"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${deriveColor(s.uid)} text-xs font-medium text-white`}
                      >
                        {deriveInitials(s.name)}
                      </div>
                      <span className="truncate text-sm font-medium text-foreground">{s.name}</span>
                    </div>
                    <span className="text-sm text-foreground">{s.wordsThisWeek}</span>
                    <span className="pl-6 text-sm text-muted-foreground">{formatLastActive(s.lastActiveAt)}</span>
                  </Link>
                ))
              )}
            </div>

            <div className="mt-auto pt-5">
              <Link
                href="/students"
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-border py-2.5 text-sm font-medium text-[#8DCEF9] transition-colors hover:bg-white/[0.04]"
              >
                View all students
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

        </div>
      </div>

      <AddStudentDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />
    </>
  )
}
