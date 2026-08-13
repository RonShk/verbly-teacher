import 'server-only'

import { createHash } from 'node:crypto'
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

/** Shared ceiling applied to every API request from one client IP. */
export const API_IP_LIMIT: RateLimitRule = {
  name: 'apiRequests',
  limit: 120,
  windowSeconds: 60,
}

/** Stricter ceiling for the unauthenticated contact form. */
export const CONTACT_IP_LIMIT: RateLimitRule = {
  name: 'contactSubmissions',
  limit: 5,
  windowSeconds: 15 * 60,
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

/**
 * Rate-limit an arbitrary shared key, such as an IP address.
 *
 * IPs are hashed before they become Firestore document IDs. This limiter uses
 * a separate top-level namespace because an IP is not a tutor-owned resource.
 */
async function checkSharedRateLimit(
  key: string,
  rule: RateLimitRule,
): Promise<RateLimitResult> {
  const db = getAdminFirestore()
  const keyHash = createHash('sha256').update(key).digest('hex')
  const ref = db
    .collection('rateLimitKeys')
    .doc(keyHash)
    .collection('buckets')
    .doc(rule.name)

  try {
    return await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref)
      const now = Date.now()
      const windowMs = rule.windowSeconds * 1000

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
    // Preserve availability if Firestore is temporarily unavailable. A later
    // migration to Redis/edge storage can make this fail closed if needed.
    console.error(`[rateLimit] shared ${rule.name} check failed, allowing request:`, err)
    return { allowed: true, remaining: 0, retryAfterSeconds: 0 }
  }
}

function getClientIp(request: Request): string {
  // These headers are populated by the hosting proxy. Use the first address
  // in the forwarded chain, and never persist the raw value.
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown'
  return request.headers.get('x-real-ip')?.trim() || 'unknown'
}

/** Check a request's client IP and return a 429 response when it is limited. */
export async function checkIpRateLimit(
  request: Request,
  rule: RateLimitRule = API_IP_LIMIT,
): Promise<RateLimitResult> {
  return checkSharedRateLimit(`ip:${getClientIp(request)}`, rule)
}

/** Convenience guard for route handlers. */
export async function enforceIpRateLimit(
  request: Request,
  rule: RateLimitRule = API_IP_LIMIT,
  whatRanOut = 'requests',
): Promise<Response | null> {
  const result = await checkIpRateLimit(request, rule)
  return result.allowed ? null : tooManyRequests(result, whatRanOut)
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
