import { Resend } from 'resend'

interface StudentInviteEmailParams {
  recipientEmail: string
  recipientName: string
  tutorName: string
  expiresInDays: number
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>\"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] ?? character)
}

function getDownloadUrl(): string {
  return process.env.VERBLY_STUDENT_APP_DOWNLOAD_URL?.trim() || 'https://verbly.study/download'
}

function getFromAddress(): string {
  const from = process.env.RESEND_FROM_EMAIL?.trim()
  if (!from) throw new Error('RESEND_FROM_EMAIL is not configured')
  return from
}

function getReplyToAddress(): string | undefined {
  return process.env.RESEND_REPLY_TO_EMAIL?.trim() || undefined
}

function buildInviteHtml({ recipientName, tutorName, expiresInDays }: StudentInviteEmailParams): string {
  const safeName = escapeHtml(recipientName)
  const safeTutorName = escapeHtml(tutorName)
  const downloadUrl = getDownloadUrl()

  return `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0;background:#0a0a0a;color:#f0f0f0;font-family:Arial,Helvetica,sans-serif;">
    <div style="padding:36px 16px;">
      <div style="max-width:560px;margin:0 auto;background:#161616;border:1px solid #2b2b2b;border-radius:20px;overflow:hidden;">
        <div style="padding:28px 32px;border-bottom:1px solid #2b2b2b;">
          <div style="font-size:22px;font-weight:700;letter-spacing:-.03em;color:#8dcef9;">Verbly</div>
        </div>
        <div style="padding:36px 32px 32px;">
          <p style="margin:0 0 12px;color:#8dcef9;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">You’re invited</p>
          <h1 style="margin:0 0 16px;font-size:30px;line-height:1.15;letter-spacing:-.04em;color:#ffffff;">Learn with ${safeTutorName}</h1>
          <p style="margin:0 0 26px;font-size:16px;line-height:1.65;color:#c0c0c0;">Hi ${safeName}, ${safeTutorName} invited you to join them on Verbly. Download the app to practice your vocabulary and keep your progress in one place.</p>
          <div style="text-align:center;margin:0 0 30px;"><a href="${escapeHtml(downloadUrl)}" style="display:inline-block;background:#8dcef9;color:#0a1a2a;text-decoration:none;font-size:15px;font-weight:700;padding:14px 24px;border-radius:10px;">Download the Verbly app</a></div>
          <div style="padding:22px 20px;background:#0d202e;border:1px solid #27516c;border-radius:14px;text-align:center;">
            <p style="margin:0;color:#a8dafc;font-size:14px;line-height:1.6;">Sign in to the Verbly app with this email address and your tutor connection will be set up automatically.</p>
            <p style="margin:12px 0 0;color:#9bb2c0;font-size:12px;line-height:1.5;">This invitation expires in ${expiresInDays} days.</p>
          </div>
          <p style="margin:26px 0 0;color:#777;font-size:12px;line-height:1.6;">If you weren’t expecting this invitation, you can safely ignore this email.</p>
        </div>
      </div>
      <p style="max-width:560px;margin:18px auto 0;text-align:center;color:#666;font-size:11px;">Verbly · Practice with purpose</p>
    </div>
  </body>
</html>`
}

function buildInviteText(params: StudentInviteEmailParams): string {
  return `Hi ${params.recipientName},

${params.tutorName} invited you to join them on Verbly.

Download the Verbly app: ${getDownloadUrl()}

Sign in to the Verbly app with this email address and your tutor connection will be set up automatically. This invitation expires in ${params.expiresInDays} days.

If you weren’t expecting this invitation, you can safely ignore this email.`
}

export async function sendStudentInviteEmail(params: StudentInviteEmailParams): Promise<string> {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) throw new Error('RESEND_API_KEY is not configured')

  const resend = new Resend(apiKey)
  const { data, error } = await resend.emails.send({
    from: getFromAddress(),
    to: [params.recipientEmail],
    replyTo: getReplyToAddress(),
    subject: `${params.tutorName} invited you to join Verbly`,
    html: buildInviteHtml(params),
    text: buildInviteText(params),
  })

  if (error || !data?.id) {
    throw new Error(error?.message || 'Resend did not return an email id')
  }
  return data.id
}
