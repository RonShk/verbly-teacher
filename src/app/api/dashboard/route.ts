import { parseTimezoneOffsetMinutes } from '@/lib/server/dayBounds'
import { verifyAuth } from '@/lib/server/verifyAuth'
import { enforceIpRateLimit } from '@/lib/server/rateLimit'
import type { DashboardResponse, StudentDashboard } from '@/types/dashboard'

import { timed } from './lib/_timing'
import { buildHeader } from './lib/header'
import { buildVocabHealth } from './lib/health'
import { buildTodaysPractice } from './lib/practice'
import { fetchRoster } from './lib/roster'
import { fetchDashboardSources } from './lib/sources'
import { buildStats } from './lib/stats'
import { buildTrends } from './lib/trends'

/**
 * GET /api/dashboard — everything the home page shows, in one request.
 *
 * Without `?student=`: returns the roster plus the dashboard for the most
 * recently active student (initial page load).
 * With `?student=<uid>`: returns just that student's dashboard (switcher).
 */
export async function GET(request: Request): Promise<Response> {
  const ipLimited = await enforceIpRateLimit(request)
  if (ipLimited) return ipLimited

  const requestStart = performance.now()
  const auth = await timed('verifyAuth', verifyAuth(request))
  if (!auth.ok) return auth.response

  const { searchParams } = new URL(request.url)
  const timezoneOffsetMinutes = parseTimezoneOffsetMinutes(searchParams)
  const requestedUid = searchParams.get('student')

  if (requestedUid) {
    const dashboard = await buildStudentDashboard(auth.tutorUid, requestedUid, timezoneOffsetMinutes)
    if (!dashboard) {
      return Response.json({ error: 'Student not on your roster' }, { status: 403 })
    }
    console.log(`[dashboard] TOTAL: ${Math.round(performance.now() - requestStart)}ms`)
    return Response.json({ dashboard } satisfies DashboardResponse)
  }

  const roster = await timed('fetchRoster', fetchRoster(auth.tutorUid))
  if (roster.length === 0) {
    return Response.json({ roster, dashboard: null } satisfies DashboardResponse)
  }

  const dashboard = await buildStudentDashboard(auth.tutorUid, roster[0].uid, timezoneOffsetMinutes)
  console.log(`[dashboard] TOTAL: ${Math.round(performance.now() - requestStart)}ms`)
  return Response.json({ roster, dashboard } satisfies DashboardResponse)
}

async function buildStudentDashboard(
  tutorUid: string,
  studentUid: string,
  timezoneOffsetMinutes: number): Promise<StudentDashboard | null> {
  const sources = await timed('fetchDashboardSources', fetchDashboardSources(tutorUid, studentUid, timezoneOffsetMinutes))
  if (!sources) return null

  const buildStart = performance.now()
  const dashboard = {
    student: buildHeader(sources),
    todaysPractice: buildTodaysPractice(sources),
    vocabHealth: buildVocabHealth(sources),
    stats: buildStats(sources),
    trends: buildTrends(sources),
  }
  console.log(`[dashboard] builders (sync): ${Math.round(performance.now() - buildStart)}ms`)
  return dashboard
}
