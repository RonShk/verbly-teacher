import { getAdminAuth } from '@/lib/firebase/admin'

export type VerifyAuthResult =| { ok: true; tutorUid: string } | { ok: false; response: Response }

function allowedTutorEmails(): Set<string> {
  return new Set(
    (process.env.TUTOR_ALLOWLIST_EMAILS ?? '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  )
}

export function isAllowedTutorEmail(email: string | null | undefined): boolean {
  const allowlist = allowedTutorEmails()
  return allowlist.size > 0 && Boolean(email && allowlist.has(email.trim().toLowerCase()))
}

function unauthorized(message = 'Invalid or expired token'): VerifyAuthResult {
  return {
    ok: false,
    response: Response.json({ error: message }, { status: 401 }),
  }
}

/** Verify a Firebase ID token string (from Bearer header or legacy JSON body). */
export async function verifyIdToken(idToken: string | null | undefined): Promise<VerifyAuthResult> {
  if (!idToken) {
    return {
      ok: false,
      response: Response.json({ error: 'Authorization required' }, { status: 401 }),
    }
  }

  try {
    const decoded = await getAdminAuth().verifyIdToken(idToken)
    const user = await getAdminAuth().getUser(decoded.uid)
    if (!isAllowedTutorEmail(user.email)) {
      return {
        ok: false,
        response: Response.json({ error: 'This tutor account is not enabled yet.' }, { status: 403 }),
      }
    }
    return { ok: true, tutorUid: decoded.uid }
  } catch {
    return unauthorized()
  }
}

/** Read `Authorization: Bearer <token>` from a Route Handler request. */
export async function verifyAuth(request: Request): Promise<VerifyAuthResult> {
  const authHeader = request.headers.get('Authorization')
  const idToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  return verifyIdToken(idToken)
}
