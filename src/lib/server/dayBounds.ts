/** Client-local calendar day string (YYYY-MM-DD), same convention as getHomePageData. */
export function getTodayDateString(utcOffsetMinutes: number): string {
  const offsetMs = utcOffsetMinutes * 60_000
  const clientLocal = new Date(Date.now() + offsetMs)
  return clientLocal.toISOString().slice(0, 10)
}

/** Whether a UTC instant falls on the given client-local calendar day. */
export function isInstantOnDate(
  instant: Date,
  todayStr: string,
  utcOffsetMinutes: number,
): boolean {
  const offsetMs = utcOffsetMinutes * 60_000
  const clientLocal = new Date(instant.getTime() + offsetMs)
  return clientLocal.toISOString().slice(0, 10) === todayStr
}

/**
 * UTC instants for the start (inclusive) and end (exclusive) of a client-local
 * calendar day. Matches {@link getTodayDateString} / {@link isInstantOnDate}.
 */
export function getClientLocalDayTimestampBounds(
  todayStr: string,
  utcOffsetMinutes: number,
): { start: Date; end: Date } {
  const [year, month, day] = todayStr.split('-').map(Number)
  const offsetMs = utcOffsetMinutes * 60_000
  const startMs = Date.UTC(year, month - 1, day) - offsetMs
  const endMs = Date.UTC(year, month - 1, day + 1) - offsetMs
  return { start: new Date(startMs), end: new Date(endMs) }
}

export function parseTimezoneOffsetMinutes(
  searchParams: URLSearchParams,
): number {
  const raw = searchParams.get('timezoneOffsetMinutes')
  if (raw == null || raw === '') return 0
  const n = Number(raw)
  return Number.isFinite(n) ? n : 0
}
