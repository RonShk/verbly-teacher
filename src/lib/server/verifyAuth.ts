import { getAdminAuth } from '@/lib/firebase/admin'

export type VerifyAuthResult =| { ok: true; tutorUid: string } | { ok: false; response: Response }

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
