import { isEndpointMissing } from "./errors"
import type { Live } from "../types"

/**
 * Runs a contract call; a not-yet-built route (404 "route could not be found"
 * / 405) resolves to `{available: false}` instead of throwing (CLAUDE.md §14).
 * Any other error — 403, 422, a record 404, a network failure — still throws.
 */
export async function live<T>(call: () => Promise<T>): Promise<Live<T>> {
  try {
    return { available: true, data: await call() }
  } catch (error) {
    if (error instanceof Error && isEndpointMissing(error))
      return { available: false, data: null }
    throw error
  }
}
