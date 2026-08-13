// Browser-only — pairs with lib/server/verifyAuth.ts on the receiving end.

import { clientAuth } from '@/lib/firebase/client'

/**
 * fetch() with the signed-in tutor's Firebase ID token attached, which every
 * route under /api verifies before touching Firestore.
 *
 * Returns null when Firebase has no user yet — callers treat that as "not ready"
 * rather than as a failure, since the protected layout only renders once the
 * session is restored.
 */
export async function authedFetch(path: string, init?: RequestInit): Promise<Response | null> {
  const user = clientAuth.currentUser
  if (!user) return null
  const token = await user.getIdToken()

  return fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
      Authorization: `Bearer ${token}`,
    },
  })
}
