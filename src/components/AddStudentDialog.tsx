'use client'

import { useRef, useState } from 'react'
import { CheckCircle2, UserPlus } from 'lucide-react'

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

export type AddedStudent = {
  uid: string
  name: string
  email: string
  inviteId?: string
  inviteStatus?: 'sent'
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type AddError = 'not_found' | 'already_added' | 'already_linked' | 'email_failed' | 'not_configured' | 'generic'

const ADD_ERROR_MESSAGES: Record<AddError, string> = {
  not_found: 'No student account found for this email. Double-check the spelling.',
  already_added: 'This student is already in your class.',
  already_linked: 'This student is already linked to another tutor.',
  email_failed: 'The student was added, but we could not send the invitation email. Please try again later.',
  not_configured: 'Invitations are not configured yet. Add the Resend API key first.',
  generic: 'Something went wrong. Please try again.',
}

type SearchResult = { uid: string; name: string; email: string; signUpDate: string | null }

export function AddStudentDialog({
  open,
  onOpenChange,
  onAdded,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdded: (student: AddedStudent) => void
}) {
  const [email, setEmail] = useState('')
  const [touched, setTouched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState<AddError | null>(null)
  const [sentEmail, setSentEmail] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<SearchResult[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const noResultsPrefixRef = useRef<string | null>(null)

  const isValid = EMAIL_RE.test(email)
  const showValidationError = touched && email.length > 0 && !isValid

  async function fetchSuggestions(query: string) {
    if (query.length < 4) {
      setSuggestions([])
      setShowSuggestions(false)
      noResultsPrefixRef.current = null
      return
    }
    if (noResultsPrefixRef.current && query.startsWith(noResultsPrefixRef.current)) return
    const currentUser = clientAuth.currentUser
    if (!currentUser) return
    const idToken = await currentUser.getIdToken()
    const res = await fetch(`/api/students/search?q=${encodeURIComponent(query)}`, {
      headers: { Authorization: `Bearer ${idToken}` },
    })
    if (!res.ok) return
    const { students } = await res.json()
    if (students.length === 0) {
      noResultsPrefixRef.current = query
    } else {
      noResultsPrefixRef.current = null
    }
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
    setEmail('')
    setTouched(false)
    setLoading(false)
    setApiError(null)
    setSentEmail(null)
    setSuggestions([])
    setShowSuggestions(false)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    noResultsPrefixRef.current = null
    onOpenChange(false)
  }

  async function handleAdd() {
    if (!isValid || loading) return
    setShowSuggestions(false)
    setLoading(true)
    setApiError(null)
    try {
      const currentUser = clientAuth.currentUser
      if (!currentUser) throw new Error('Not authenticated')
      const idToken = await currentUser.getIdToken()
      const res = await fetch('/api/students/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ studentEmail: email }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        const student = data.student as { uid: string; name: string; email: string } | null
        const invitation = data.invitation as { id: string; email: string; status: 'sent' }
        setSentEmail(invitation.email)
        onAdded({
          uid: student?.uid ?? `pending:${invitation.id}`,
          name: student?.name ?? 'Pending invitation',
          email: student?.email ?? invitation.email,
          inviteId: invitation.id,
          inviteStatus: 'sent',
        })
        return
      }
      if (res.status === 404) setApiError('not_found')
      else if (res.status === 409) setApiError(data.error === 'already_linked' ? 'already_linked' : 'already_added')
      else if (res.status === 502) setApiError('email_failed')
      else if (res.status === 503) setApiError('not_configured')
      else setApiError('generic')
    } catch {
      setApiError('generic')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
      <DialogContent showCloseButton={false} className="gap-0 rounded-2xl p-0 sm:max-w-sm">
        <DialogHeader className="items-center px-6 pb-5 pt-8 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(141,206,249,0.1)]">
            <UserPlus className="h-5 w-5 text-[#8DCEF9]" />
          </div>
          <DialogTitle className="text-base font-semibold text-foreground">
            {sentEmail ? 'Invitation sent' : 'Invite a Student'}
          </DialogTitle>
          <DialogDescription className="mt-1.5 text-center text-sm text-muted-foreground">
            {sentEmail ? `The invitation was sent to ${sentEmail}.` : "They'll receive an invite to join your class."}
          </DialogDescription>
        </DialogHeader>

        {sentEmail ? (
          <div className="flex flex-col items-center gap-3 px-6 py-8 text-center">
            <CheckCircle2 className="h-10 w-10 text-[#8DCEF9]" />
            <p className="text-sm text-muted-foreground">They can sign in to Verbly with that email to join your class.</p>
          </div>
        ) : <div className="flex flex-col gap-1.5 px-6 py-5">
          <label className="text-sm font-medium text-foreground">Student Email</label>
          <div className="relative">
            <Input
              type="email"
              placeholder="student@email.com"
              value={email}
              onChange={handleEmailChange}
              onBlur={() => {
                setTouched(true)
                // slight delay so a click on a suggestion registers first
                setTimeout(() => setShowSuggestions(false), 150)
              }}
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
                          {new Date(s.signUpDate).toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                          })}
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
        </div>}

        <DialogFooter className="flex-row gap-3 border-t border-border px-6 py-4 sm:flex-row sm:justify-stretch">
          <Button
            disabled={sentEmail !== null || !isValid || loading}
            onClick={handleAdd}
            className="flex-1 rounded-xl bg-[#8DCEF9] font-medium text-[#0a1a2a] hover:bg-[#A8DAFC] disabled:opacity-30"
          >
            {sentEmail ? 'Email sent' : loading ? 'Sending…' : 'Send invitation'}
          </Button>
          <Button
            onClick={handleClose}
            disabled={loading}
            className="flex-1 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#1e1e1e] text-[#c0c0c0] hover:bg-[#252525] hover:text-foreground"
          >
            {sentEmail ? 'Done' : 'Go back'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
