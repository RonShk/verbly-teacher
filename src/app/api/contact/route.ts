import { Resend } from 'resend'
import { CONTACT_IP_LIMIT, enforceIpRateLimit } from '@/lib/server/rateLimit'

interface ContactBody {
  firstName: string
  lastName: string
  email: string
  subject: string
  message: string
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validate(body: Partial<ContactBody>): string | null {
  if (!body.firstName?.trim()) return 'firstName is required'
  if (!body.lastName?.trim()) return 'lastName is required'
  if (!body.email?.trim()) return 'email is required'
  if (!EMAIL_REGEX.test(body.email)) return 'email is invalid'
  if (!body.subject?.trim()) return 'subject is required'
  if (!body.message?.trim()) return 'message is required'
  return null
}

export async function POST(request: Request): Promise<Response> {
  const ipLimited = await enforceIpRateLimit(request)
  if (ipLimited) return ipLimited
  const contactLimited = await enforceIpRateLimit(request, CONTACT_IP_LIMIT, 'contact submissions')
  if (contactLimited) return contactLimited

  let body: Partial<ContactBody>
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const validationError = validate(body)
  if (validationError) {
    return Response.json({ error: validationError }, { status: 422 })
  }

  const { firstName, lastName, email, subject, message } = body as ContactBody

  const resend = new Resend(process.env.RESEND_API_KEY)

  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || 'Verbly <invites@mail.verbly.study>',
    to: 'verblysupport@gmail.com',
    replyTo: `${firstName} ${lastName} <${email}>`,
    subject: `[Contact] ${subject}`,
    text: `From: ${firstName} ${lastName} <${email}>\n\n${message}`,
    html: `
      <p><strong>From:</strong> ${firstName} ${lastName} &lt;${email}&gt;</p>
      <hr />
      <p>${message.replace(/\n/g, '<br />')}</p>
    `,
  })

  if (error) {
    console.error('Resend error:', error)
    return Response.json({ error: 'Failed to send message' }, { status: 500 })
  }

  return Response.json({ success: true }, { status: 200 })
}
