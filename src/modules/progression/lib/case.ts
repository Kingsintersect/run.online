// The contract is snake_case, but this API's live resources are camelCase.
// Responses are passed through `snakeKeys()` at the service boundary before
// Zod parsing, so either casing parses to the contract's canonical
// snake_case shape. Idempotent on snake_case input.
//
// Only keys containing a lower→upper transition (`majorProgramId`) are
// rewritten; ALL_CAPS keys such as the outcome keys of `counts`
// (`PROMOTED_WITH_CARRYOVER`) and plain keys are left untouched.

export type Json =
  | string
  | number
  | boolean
  | null
  | Json[]
  | { [key: string]: Json }

const CAMEL = /[a-z0-9][A-Z]/

function toSnake(key: string): string {
  if (!CAMEL.test(key)) return key
  return key.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase()
}

export function snakeKeys(value: Json): Json {
  if (Array.isArray(value)) return value.map(snakeKeys)
  if (value !== null && typeof value === "object") {
    const out: { [key: string]: Json } = {}
    for (const [k, v] of Object.entries(value)) {
      const key = toSnake(k)
      // A snake_case key wins over its camelCase twin if both are present.
      if (key in out && key !== k) continue
      out[key] = snakeKeys(v)
    }
    return out
  }
  return value
}
