// TEMPORARY diagnostic helper — remove after perf investigation.
// Logs stage durations to the dev-server terminal.

export async function timed<T>(label: string, promise: Promise<T>): Promise<T> {
  const start = performance.now()
  const result = await promise
  console.log(`[dashboard] ${label}: ${Math.round(performance.now() - start)}ms`)
  return result
}
