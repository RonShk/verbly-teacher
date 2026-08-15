'use client'

import { useState } from 'react'
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

type AddError = 'already_added' | 'already_linked' | 'email_failed' | 'not_configured' | 'generic'

const ADD_ERROR_MESSAGES: Record<AddError, string> = {
  already_added: 'This student has already been added or invited.',
  already_linked: 'This student is already linked to another tutor.',
  email_failed: 'The student was added, but we could not send the invitation email. Please try again later.',
  not_configured: 'Invitations are not configured yet. Add the Resend API key first.',
  generic: 'Something went wrong. Please try again.',
}

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

  const isValid = EMAIL_RE.test(email)
  const showValidationError = touched && email.length > 0 && !isValid

  function handleClose() {
    setEmail('')
    setTouched(false)
    setLoading(false)
    setApiError(null)
    setSentEmail(null)
    onOpenChange(false)
  }

  async function handleAdd() {
    if (!isValid || loading) return
    setLoading(true)
    setApiError(null)
    try {
      const currentUser = clientAuth.currentUser
      if (!currentUser) throw new Error('Not authenticated')
      const idToken = await currentUser.getIdToken()
      const res = await fetch('/api/students/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ studentEmail: email.trim() }),
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
      if (res.status === 409) setApiError(data.error === 'already_linked' ? 'already_linked' : 'already_added')
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
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) handleClose() }}>
      <DialogContent showCloseButton={false} className="gap-0 rounded-2xl p-0">
        <DialogHeader className="items-center px-6 pb-5 pt-8 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(141,206,249,0.1)]">
            {sentEmail ? <CheckCircle2 className="h-6 w-6 text-[#8DCEF9]" /> : <UserPlus className="h-5 w-5 text-[#8DCEF9]" />}
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
            <p className="text-sm text-muted-foreground">They can sign in to Verbly with that email to join your class.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5 px-6 py-5">
            <label className="text-sm font-medium text-foreground">Student Email</label>
            <Input
              type="email"
              placeholder="student@email.com"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value)
                if (apiError) setApiError(null)
              }}
              onBlur={() => setTouched(true)}
              aria-invalid={showValidationError}
              disabled={loading}
            />
            {showValidationError && <p className="text-xs text-[#f09595]">Please enter a valid email address.</p>}
            {apiError && <p className="text-xs text-[#f09595]">{ADD_ERROR_MESSAGES[apiError]}</p>}
          </div>
        )}

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
