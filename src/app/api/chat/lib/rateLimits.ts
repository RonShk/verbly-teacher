import type { RateLimitRule } from '@/lib/server/rateLimit'

/**
 * Per-tutor ceilings on the two endpoints that call Gemini. These are abuse and
 * runaway-cost guards, set well above what a tutor hits in normal use — a busy
 * session is a handful of questions per student, not dozens per hour.
 */

/** One tutor message, which may fan out to several model rounds and tool calls. */
export const CHAT_TURN_LIMIT: RateLimitRule = {
  name: 'chatTurns',
  limit: 40,
  windowSeconds: 60 * 60,
}

/** Auto-naming fires once per new thread, so this only bites on rapid churn. */
export const CHAT_TITLE_LIMIT: RateLimitRule = {
  name: 'chatTitles',
  limit: 60,
  windowSeconds: 60 * 60,
}
