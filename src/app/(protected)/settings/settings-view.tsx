'use client'

import { useRef, useState } from 'react'
import {
  deleteUser,
  GoogleAuthProvider,
  linkWithPhoneNumber,
  RecaptchaVerifier,
  reauthenticateWithPopup,
  signOut,
  updateProfile,
  verifyBeforeUpdateEmail,
  type ConfirmationResult,
  type User,
} from 'firebase/auth'
import { AlertTriangle, Check, Mail, Phone, Shield, UserRound } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { clientAuth } from '@/lib/firebase/client'

type Notice = { kind: 'success' | 'error'; text: string } | null

function firebaseErrorMessage(error: unknown, fallback: string): string {
  const code = (error as { code?: string })?.code
  if (code === 'auth/requires-recent-login') {
    return 'For your security, please sign in again and retry this change.'
  }
  if (code === 'auth/email-already-in-use') return 'That email address is already in use.'
  if (code === 'auth/invalid-email') return 'Enter a valid email address.'
  if (code === 'auth/invalid-phone-number') return 'Enter a valid phone number with country code.'
  if (code === 'auth/credential-already-in-use') return 'That phone number is already linked to another account.'
  if (code === 'auth/too-many-requests') return 'Too many attempts. Please wait a little and try again.'
  if (code === 'auth/popup-closed-by-user') return 'The sign-in window was closed before it finished.'
  return fallback
}

async function reauthenticate(user: User) {
  const provider = new GoogleAuthProvider()
  await reauthenticateWithPopup(user, provider)
}

export function SettingsView() {
  const router = useRouter()
  const currentUser = clientAuth.currentUser
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null)
  const confirmationRef = useRef<ConfirmationResult | null>(null)

  const [preferredName, setPreferredName] = useState(currentUser?.displayName ?? '')
  const [email, setEmail] = useState(currentUser?.email ?? '')
  const [phone, setPhone] = useState(currentUser?.phoneNumber ?? '')
  const [verificationCode, setVerificationCode] = useState('')
  const [phoneStep, setPhoneStep] = useState<'phone' | 'code'>('phone')
  const [profileNotice, setProfileNotice] = useState<Notice>(null)
  const [emailNotice, setEmailNotice] = useState<Notice>(null)
  const [phoneNotice, setPhoneNotice] = useState<Notice>(null)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingEmail, setSavingEmail] = useState(false)
  const [sendingCode, setSendingCode] = useState(false)
  const [confirmingCode, setConfirmingCode] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  if (!currentUser) return null
  const authenticatedUser = currentUser as User

  async function saveProfile() {
    setSavingProfile(true)
    setProfileNotice(null)
    try {
      await updateProfile(authenticatedUser, { displayName: preferredName.trim() || null })
      setProfileNotice({ kind: 'success', text: 'Your preferred name was saved.' })
    } catch (error) {
      setProfileNotice({ kind: 'error', text: firebaseErrorMessage(error, 'Could not save your name.') })
    } finally {
      setSavingProfile(false)
    }
  }

  async function saveEmail() {
    const nextEmail = email.trim()
    if (!nextEmail || nextEmail === authenticatedUser.email) return
    setSavingEmail(true)
    setEmailNotice(null)
    try {
      await verifyBeforeUpdateEmail(authenticatedUser, nextEmail)
      setEmailNotice({ kind: 'success', text: 'Check your new email for a verification link.' })
    } catch (error) {
      if ((error as { code?: string })?.code === 'auth/requires-recent-login') {
        try {
          await reauthenticate(authenticatedUser)
          await verifyBeforeUpdateEmail(authenticatedUser, nextEmail)
          setEmailNotice({ kind: 'success', text: 'Check your new email for a verification link.' })
        } catch (reauthError) {
          setEmailNotice({ kind: 'error', text: firebaseErrorMessage(reauthError, 'Could not update your email.') })
        }
      } else {
        setEmailNotice({ kind: 'error', text: firebaseErrorMessage(error, 'Could not update your email.') })
      }
    } finally {
      setSavingEmail(false)
    }
  }

  async function sendPhoneCode() {
    const nextPhone = phone.trim()
    if (!nextPhone) return
    setSendingCode(true)
    setPhoneNotice(null)
    try {
      if (!recaptchaRef.current) {
        recaptchaRef.current = new RecaptchaVerifier(clientAuth, 'settings-recaptcha', { size: 'invisible' })
      }
      confirmationRef.current = await linkWithPhoneNumber(authenticatedUser, nextPhone, recaptchaRef.current)
      setPhoneStep('code')
      setPhoneNotice({ kind: 'success', text: 'A verification code was sent to your phone.' })
    } catch (error) {
      recaptchaRef.current?.clear()
      recaptchaRef.current = null
      setPhoneNotice({ kind: 'error', text: firebaseErrorMessage(error, 'Could not send a verification code.') })
    } finally {
      setSendingCode(false)
    }
  }

  async function confirmPhoneCode() {
    if (!confirmationRef.current || !verificationCode.trim()) return
    setConfirmingCode(true)
    setPhoneNotice(null)
    try {
      await confirmationRef.current.confirm(verificationCode.trim())
      setPhone(phone)
      setVerificationCode('')
      setPhoneStep('phone')
      confirmationRef.current = null
      recaptchaRef.current?.clear()
      recaptchaRef.current = null
      setPhoneNotice({ kind: 'success', text: 'Your phone number was linked.' })
    } catch (error) {
      setPhoneNotice({ kind: 'error', text: firebaseErrorMessage(error, 'That code was not accepted.') })
    } finally {
      setConfirmingCode(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    setDeleteError(null)
    try {
      try {
        await deleteUser(authenticatedUser)
      } catch (error) {
        if ((error as { code?: string })?.code !== 'auth/requires-recent-login') throw error
        await reauthenticate(authenticatedUser)
        await deleteUser(authenticatedUser)
      }
      await signOut(clientAuth)
      router.replace('/login')
    } catch (error) {
      setDeleteError(firebaseErrorMessage(error, 'Could not delete your account.'))
      setDeleting(false)
    }
  }

  return (
    <main className="flex-1 bg-background px-6 py-10 md:px-10">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.12em] text-[#8DCEF9]">Account</p>
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">Settings</h1>
          <p className="mt-2 text-sm text-muted-foreground">Manage your profile and how you sign in to Verbly.</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-full bg-[#8DCEF9]/10 text-[#8DCEF9]"><UserRound className="size-4" /></div>
              <div><CardTitle>Profile</CardTitle><CardDescription>Your name is shown across the tutor dashboard.</CardDescription></div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="flex flex-col gap-2"><label htmlFor="preferred-name" className="text-sm font-medium">Preferred name</label><Input id="preferred-name" value={preferredName} onChange={(event) => setPreferredName(event.target.value)} placeholder="How should we call you?" maxLength={80} /><p className="text-xs text-muted-foreground">This changes your display name, not your sign-in provider.</p></div>
            <div className="flex items-center justify-between gap-4"><Notice notice={profileNotice} /><Button onClick={saveProfile} disabled={savingProfile}>{savingProfile ? 'Saving…' : 'Save name'}</Button></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3"><div className="flex size-9 items-center justify-center rounded-full bg-[#8DCEF9]/10 text-[#8DCEF9]"><Mail className="size-4" /></div><div><CardTitle>Email address</CardTitle><CardDescription>We’ll send a verification link before changing it.</CardDescription></div></div>
          </CardHeader>
          <CardContent className="flex flex-col gap-5"><div className="flex flex-col gap-2"><label htmlFor="email" className="text-sm font-medium">Email</label><Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></div><div className="flex items-center justify-between gap-4"><Notice notice={emailNotice} /><Button onClick={saveEmail} disabled={savingEmail || !email.trim() || email.trim() === authenticatedUser.email}>{savingEmail ? 'Sending…' : 'Change email'}</Button></div></CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3"><div className="flex size-9 items-center justify-center rounded-full bg-[#8DCEF9]/10 text-[#8DCEF9]"><Phone className="size-4" /></div><div><CardTitle>Phone number</CardTitle><CardDescription>Add a phone number as another sign-in and recovery method.</CardDescription></div></div>
          </CardHeader>
          <CardContent className="flex flex-col gap-5"><div className="flex flex-col gap-2"><label htmlFor="phone" className="text-sm font-medium">Phone number</label><Input id="phone" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+1 555 123 4567" disabled={phoneStep === 'code' || Boolean(authenticatedUser.phoneNumber)} /><p className="text-xs text-muted-foreground">{authenticatedUser.phoneNumber ? 'A phone number is already linked to this account.' : 'Include the country code, for example +1 or +44.'}</p></div>{phoneStep === 'code' && <div className="flex flex-col gap-2"><label htmlFor="verification-code" className="text-sm font-medium">Verification code</label><Input id="verification-code" inputMode="numeric" autoComplete="one-time-code" value={verificationCode} onChange={(event) => setVerificationCode(event.target.value)} placeholder="123456" maxLength={6} /></div>}<div className="flex items-center justify-between gap-4"><Notice notice={phoneNotice} /><div className="flex gap-2">{phoneStep === 'code' && <Button variant="ghost" onClick={() => { setPhoneStep('phone'); setVerificationCode(''); confirmationRef.current = null }}>Back</Button>}{!authenticatedUser.phoneNumber && <Button onClick={phoneStep === 'phone' ? sendPhoneCode : confirmPhoneCode} disabled={sendingCode || confirmingCode || !phone.trim() || (phoneStep === 'code' && !verificationCode.trim())}>{phoneStep === 'phone' ? (sendingCode ? 'Sending…' : 'Send code') : (confirmingCode ? 'Verifying…' : 'Verify phone')}</Button>}</div></div><div id="settings-recaptcha" /></CardContent>
        </Card>

        <Card className="border border-border bg-card">
          <CardHeader><div className="flex items-center gap-3"><div className="flex size-9 items-center justify-center rounded-full bg-[#8DCEF9]/10 text-[#8DCEF9]"><Shield className="size-4" /></div><div><CardTitle>Sign-in security</CardTitle><CardDescription>You currently sign in with Google.</CardDescription></div></div></CardHeader>
          <CardContent><p className="text-sm text-muted-foreground">Sensitive account changes may ask you to sign in with Google again. This protects your account if someone gains access to an open browser session.</p></CardContent>
        </Card>

        <Card className="border border-destructive/30 bg-destructive/5">
          <CardHeader><div className="flex items-center gap-3"><div className="flex size-9 items-center justify-center rounded-full bg-destructive/10 text-destructive"><AlertTriangle className="size-4" /></div><div><CardTitle>Delete account</CardTitle><CardDescription>This permanently removes your Firebase sign-in account.</CardDescription></div></div></CardHeader>
          <CardContent className="flex flex-col gap-4"><p className="text-sm text-muted-foreground">You’ll be signed out and won’t be able to access Verbly with this account. Dashboard data cleanup requires a backend deletion workflow and is not performed by this frontend-only action.</p><Button variant="destructive" className="self-start" onClick={() => { setDeleteError(null); setDeleteOpen(true) }}>Delete my account</Button></CardContent>
        </Card>
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent><DialogHeader><DialogTitle>Delete your account?</DialogTitle><DialogDescription>This cannot be undone. Your Firebase sign-in account will be permanently deleted. Type DELETE below to confirm.</DialogDescription></DialogHeader><DeleteConfirmation onCancel={() => setDeleteOpen(false)} onConfirm={handleDelete} deleting={deleting} error={deleteError} /></DialogContent>
      </Dialog>
    </main>
  )
}

function Notice({ notice }: { notice: Notice }) {
  if (!notice) return <span />
  return <p className={notice.kind === 'error' ? 'text-xs text-destructive' : 'flex items-center gap-1 text-xs text-emerald-400'} role="status">{notice.kind === 'success' && <Check className="size-3.5" />}{notice.text}</p>
}

function DeleteConfirmation({ onCancel, onConfirm, deleting, error }: { onCancel: () => void; onConfirm: () => void; deleting: boolean; error: string | null }) {
  const [confirmation, setConfirmation] = useState('')
  return <div className="flex flex-col gap-4"><div className="flex flex-col gap-2"><label htmlFor="delete-confirmation" className="text-sm font-medium">Confirmation</label><Input id="delete-confirmation" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="DELETE" autoComplete="off" /></div>{error && <p className="text-sm text-destructive" role="alert">{error}</p>}<DialogFooter><Button variant="outline" onClick={onCancel} disabled={deleting}>Cancel</Button><Button variant="destructive" onClick={onConfirm} disabled={deleting || confirmation !== 'DELETE'}>{deleting ? 'Deleting…' : 'Permanently delete'}</Button></DialogFooter></div>
}
