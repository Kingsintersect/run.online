// Collapses repeated calls to a zero-arg async function into a single
// in-flight request, and caches its resolved value for `ttlMs`.
//
// Purpose: several composite React Query `queryFn`s in this app build the
// same shared lookup tables on every run — the course-offering list, the
// students/tutors name maps, the academic-calendar term names — by calling
// `apiClient` directly (not through React Query, so React Query can't dedupe
// them). On a page that mounts three or four of those queries at once, that's
// a dozen redundant identical backend requests per load, which is what tips
// the API's rate limiter into 429s. Wrapping each shared fetch in this makes
// a burst of callers share one request and one short-lived result.

const registry = new Set<() => void>()

/**
 * Drop every dedupe cache. Call on sign-out so the next user in the same tab
 * never sees the previous user's cached lookup data.
 */
export function clearAllDedupeCaches(): void {
  for (const clear of registry) clear()
}

export function dedupeAsync<T>(
  fn: () => Promise<T>,
  ttlMs = 30_000
): () => Promise<T> {
  let inFlight: Promise<T> | null = null
  let cached: { value: T; at: number } | null = null

  registry.add(() => {
    inFlight = null
    cached = null
  })

  return () => {
    if (cached && Date.now() - cached.at < ttlMs) {
      return Promise.resolve(cached.value)
    }
    if (inFlight) return inFlight

    inFlight = fn()
      .then((value) => {
        cached = { value, at: Date.now() }
        return value
      })
      .finally(() => {
        inFlight = null
      })

    return inFlight
  }
}
