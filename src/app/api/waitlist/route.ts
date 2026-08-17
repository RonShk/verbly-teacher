import { Resend } from 'resend'
import { WAITLIST_IP_LIMIT, enforceIpRateLimit } from '@/lib/server/rateLimit'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: Request): Promise<Response> {
  const ipLimited = await enforceIpRateLimit(request)
  if (ipLimited) return ipLimited
  const waitlistLimited = await enforceIpRateLimit(request, WAITLIST_IP_LIMIT, 'waitlist submissions')
  if (waitlistLimited) return waitlistLimited

  let body: { email?: unknown }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  if (!EMAIL_REGEX.test(email) || email.length > 254) {
    return Response.json({ error: 'Enter a valid email address.' }, { status: 422 })
  }

  const apiKey = process.env.RESEND_API_KEY?.trim()
  const segmentId = process.env.RESEND_WAITLIST_SEGMENT_ID?.trim()
  const topicId = process.env.RESEND_WAITLIST_TOPIC_ID?.trim()
  if (!apiKey || !segmentId) {
    console.error('[waitlist] RESEND_API_KEY or RESEND_WAITLIST_SEGMENT_ID is not configured')
    return Response.json({ error: 'The waitlist is not configured yet.' }, { status: 503 })
  }

  const resend = new Resend(apiKey)
  const topics = topicId ? [{ id: topicId, subscription: 'opt_in' as const }] : undefined
  const { error } = await resend.contacts.create({
    email,
    unsubscribed: false,
    segments: [{ id: segmentId }],
    topics,
  })

  // Resubmitting an address is intentionally idempotent from the visitor's
  // perspective; do not reveal whether an address already exists in Resend.
  if (error && !/already exists|already been added|duplicate/i.test(error.message)) {
    console.error('[waitlist] Resend error:', error)
    return Response.json({ error: 'Could not join the waitlist right now.' }, { status: 502 })
  }

  // A duplicate address is already registered, so do not send another email
  // every time somebody resubmits the form. New subscribers get a branded
  // transactional confirmation immediately after being added.
  if (!error) {
    const from = process.env.RESEND_FROM_EMAIL?.trim()
    if (!from) {
      console.error('[waitlist] RESEND_FROM_EMAIL is not configured')
      return Response.json({ error: 'The waitlist confirmation is not configured yet.' }, { status: 503 })
    }

    const { error: confirmationError } = await resend.emails.send({
      from,
      to: email,
      subject: 'You’re on the Verbly waitlist 🎉',
      text: 'You’re on the Verbly waitlist! We’ll email you when Verbly is no longer in private beta. Thanks for joining us.',
      html: `
        <div style="margin:0;background:#eef1f4;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#f5f5f5">
          <div style="max-width:640px;margin:0 auto;border:1px solid #25282b;border-radius:18px;overflow:hidden;background:#121313">
            <div style="padding:28px 32px;border-bottom:1px solid #25282b;background:#171819">
              <div style="font-size:26px;font-weight:800;letter-spacing:-.04em;color:#f5f5f5">✦ Verbly</div>
              <div style="margin-top:6px;font-size:10px;font-weight:700;letter-spacing:.2em;color:#8DCEF9;text-transform:uppercase">Learn. Practice. Grow.</div>
            </div>
            <div style="padding:38px 32px;background:#101d27">
              <div style="font-size:12px;font-weight:800;letter-spacing:.14em;color:#8DCEF9;text-transform:uppercase">You&apos;re in!</div>
              <h1 style="margin:14px 0 12px;font-size:34px;line-height:1.15;letter-spacing:-.04em;color:#f5f5f5">Thanks for joining the waitlist! 🎉</h1>
              <p style="margin:0;font-size:16px;line-height:1.7;color:#c3cbd2">We&apos;re excited to have you with us. You&apos;ll be one of the first to know when Verbly launches.</p>
            </div>
            <div style="padding:34px 32px 38px;text-align:center;background:#121313">
              <h2 style="margin:0;font-size:18px;color:#f0f0f0">What happens next?</h2>
              <p style="margin:12px auto 28px;max-width:420px;font-size:15px;line-height:1.65;color:#b4b7bc">We&apos;re working hard to build a better way to learn languages. We&apos;ll keep you posted with launch updates and early access news.</p>
              <div style="display:inline-block;padding:14px 22px;border-radius:10px;background:#438bb7;color:#ffffff;font-size:14px;font-weight:700">Verbly is almost here</div>
            </div>
            <div style="padding:24px 32px;border-top:1px solid #25282b;background:#0d0e0f;text-align:center">
              <p style="margin:0;font-size:12px;line-height:1.6;color:#858a91">You&apos;re receiving this because you joined the Verbly private-beta waitlist.</p>
              <p style="margin:8px 0 0;font-size:12px;color:#858a91">© 2026 Verbly. All rights reserved.</p>
            </div>
          </div>
        </div>
      `,
    })

    if (confirmationError) {
      console.error('[waitlist] confirmation email error:', confirmationError)
      return Response.json({ success: true, confirmationSent: false })
    }
  }

  return Response.json({ success: true, confirmationSent: !error })
}
