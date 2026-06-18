"use client"

import { useState } from "react"
import Link from "next/link"
import { Mail } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type FormState = {
  firstName: string
  lastName: string
  email: string
  subject: string
  message: string
}

type Errors = Partial<Record<keyof FormState, string>>

function validate(form: FormState): Errors {
  const errors: Errors = {}
  if (!form.firstName.trim()) errors.firstName = "Required"
  if (!form.lastName.trim()) errors.lastName = "Required"
  if (!form.email.trim()) {
    errors.email = "Required"
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = "Enter a valid email address"
  }
  if (!form.subject.trim()) errors.subject = "Required"
  if (!form.message.trim()) errors.message = "Required"
  return errors
}

export default function ContactPage() {
  const [form, setForm] = useState<FormState>({
    firstName: "",
    lastName: "",
    email: "",
    subject: "",
    message: "",
  })
  const [errors, setErrors] = useState<Errors>({})
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (errors[name as keyof FormState]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    const errs = validate(form)
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    setSubmitting(true)
    setServerError(null)

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      if (!res.ok) {
        const data = await res.json()
        setServerError(data.error ?? 'Something went wrong. Please try again.')
        return
      }

      setSubmitted(true)
    } catch {
      setServerError('Could not reach the server. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-1 items-center py-12">
      <div className="mx-auto w-full max-w-6xl px-6">
        <div className="flex flex-col gap-16 lg:flex-row lg:gap-24">
          <div className="flex flex-1 flex-col gap-10">
            <div className="flex flex-col gap-4">
              <h1 className="font-heading text-4xl font-semibold tracking-tight text-foreground md:text-5xl lg:text-6xl">
                Contact Us
              </h1>
              <p className="text-muted-foreground lg:text-xl">
                Have a question or need help with Verbly? Send us a message and we&apos;ll get back
                to you as soon as possible.
              </p>
            </div>
            <div className="flex flex-col gap-6 text-sm text-foreground">
              <a href="mailto:verblysupport@gmail.com" className="group flex items-center gap-3">
                <Mail className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span className="group-hover:underline">verblysupport@gmail.com</span>
              </a>
            </div>
          </div>

          <div className="flex-1">
            {submitted ? (
              <div className="flex flex-col gap-6 rounded-xl bg-muted/50 p-8 md:p-10">
                <div className="flex flex-col gap-2">
                  <h2 className="text-xl font-semibold tracking-tight text-foreground">
                    Message sent!
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Thanks for reaching out. We&apos;ll get back to you as soon as possible.
                  </p>
                </div>
                <Button asChild variant="outline" size="lg" className="w-fit">
                  <Link href="/">Go Home</Link>
                </Button>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                noValidate
                className="flex flex-col gap-6 rounded-xl bg-muted/50 p-8 md:p-10"
              >
                <div className="flex flex-col gap-1">
                  <h2 className="text-xl font-semibold tracking-tight text-foreground">
                    Send us a message
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    We usually reply within one business day.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FieldGroup label="First Name" htmlFor="firstName" error={errors.firstName}>
                    <Input
                      id="firstName"
                      name="firstName"
                      placeholder="John"
                      value={form.firstName}
                      onChange={handleChange}
                      aria-invalid={!!errors.firstName}
                    />
                  </FieldGroup>
                  <FieldGroup label="Last Name" htmlFor="lastName" error={errors.lastName}>
                    <Input
                      id="lastName"
                      name="lastName"
                      placeholder="Doe"
                      value={form.lastName}
                      onChange={handleChange}
                      aria-invalid={!!errors.lastName}
                    />
                  </FieldGroup>
                </div>

                <FieldGroup label="Email" htmlFor="email" error={errors.email}>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="name@example.com"
                    value={form.email}
                    onChange={handleChange}
                    aria-invalid={!!errors.email}
                  />
                </FieldGroup>

                <FieldGroup label="Subject" htmlFor="subject" error={errors.subject}>
                  <Input
                    id="subject"
                    name="subject"
                    placeholder="How can we help?"
                    value={form.subject}
                    onChange={handleChange}
                    aria-invalid={!!errors.subject}
                  />
                </FieldGroup>

                <FieldGroup label="Message" htmlFor="message" error={errors.message}>
                  <textarea
                    id="message"
                    name="message"
                    rows={4}
                    placeholder="What's going on? Include any details that might help us."
                    value={form.message}
                    onChange={handleChange}
                    aria-invalid={!!errors.message}
                    className={cn(
                      "w-full min-w-0 rounded-md border border-input bg-transparent px-2.5 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30",
                      errors.message &&
                        "border-destructive ring-3 ring-destructive/20 dark:border-destructive/50 dark:ring-destructive/40"
                    )}
                  />
                </FieldGroup>

                {serverError && (
                  <p className="text-sm text-destructive">{serverError}</p>
                )}

                <Button type="submit" size="lg" className="w-full" disabled={submitting}>
                  {submitting ? 'Sending…' : 'Send message'}
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function FieldGroup({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string
  htmlFor: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
        {label} <span className="text-destructive">*</span>
      </label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
