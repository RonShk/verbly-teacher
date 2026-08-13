import 'server-only'

import { Timestamp } from 'firebase-admin/firestore'

import { getAdminFirestore } from '@/lib/firebase/admin'

/**
 * Fixed-window rate limiting, counted in Firestore rather than in memory.
 *
 * Route handlers run on short-lived, horizontally scaled instances, so an
 * in-process counter would reset constantly and be trivial to sidestep by
 * spreading requests. One transactional document per tutor per bucket holds
 * regardless of which instance serves the request.
 */

export interface RateLimitRule {
  /** Bucket name — each rule gets its own window document per tutor. */
  name: string
  /** Requests allowed inside one window. */
  limit: number
  windowSeconds: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  /** Seconds until the current window resets. */
  retryAfterSeconds: number
}

/** Counts one request against the rule and reports whether it may proceed. */
export async function checkRateLimit(
  tutorUid: string,
  rule: RateLimitRule,
): Promise<RateLimitResult> {
  const db = getAdminFirestore()
  const ref = db
    .collection('teachers')
    .doc(tutorUid)
    .collection('rateLimits')
    .doc(rule.name)

  try {
    return await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref)
      const now = Date.now()
      const windowMs = rule.windowSeconds * 1000

      // A window older than its length has expired — start counting again.
      let windowStart = now
      let count = 0
      const startedAt = (snap.data()?.windowStart as Timestamp | undefined)?.toMillis() ?? 0
      if (now - startedAt < windowMs) {
        windowStart = startedAt
        count = (snap.data()?.count as number | undefined) ?? 0
      }

      const retryAfterSeconds = Math.max(1, Math.ceil((windowStart + windowMs - now) / 1000))
      if (count >= rule.limit) {
        return { allowed: false, remaining: 0, retryAfterSeconds }
      }

      tx.set(ref, { windowStart: Timestamp.fromMillis(windowStart), count: count + 1 })
      return { allowed: true, remaining: rule.limit - count - 1, retryAfterSeconds }
    })
  } catch (err) {
    // Never let the limiter itself take the feature down — a Firestore blip
    // should cost us an unmetered request, not the tutor's conversation.
    console.error(`[rateLimit] ${rule.name} check failed, allowing request:`, err)
    return { allowed: true, remaining: 0, retryAfterSeconds: 0 }
  }
}

/** "about 12 minutes" / "45 seconds" — the wait, in words the tutor can act on. */
export function describeWait(seconds: number): string {
  if (seconds < 90) return `${Math.max(1, Math.round(seconds))} seconds`
  const minutes = Math.ceil(seconds / 60)
  if (minutes < 60) return `about ${minutes} minutes`
  const hours = Math.ceil(minutes / 60)
  if (hours === 1) return 'about an hour'
  return `about ${hours} hours`
}

/** 429 with the wait both in the body (for the UI) and the standard header. */
export function tooManyRequests(result: RateLimitResult, whatRanOut: string): Response {
  const message = `You have used all your ${whatRanOut} for now. Please try again in ${describeWait(result.retryAfterSeconds)}.`
  return Response.json(
    { error: message, retryAfterSeconds: result.retryAfterSeconds },
    { status: 429, headers: { 'Retry-After': String(result.retryAfterSeconds) } },
  )
}
