/**
 * Smoke-suite configuration — read ONLY from environment variables.
 *
 * READ-ONLY SUITE: nothing in tests/smoke may submit, save, pay, sync, approve
 * or otherwise write data. Navigation, opening tabs/dialogs and cancelling
 * them, signing in and signing out are the only allowed interactions.
 */
import path from "node:path"
import { fileURLToPath } from "node:url"

const here = path.dirname(fileURLToPath(import.meta.url))
export const REPO_ROOT = path.resolve(here, "..", "..", "..")

/** Roles the suite knows how to sign in as, in run order. */
export const SMOKE_ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "STAFF",
  "DEAN",
  "HOD",
  "TUTOR",
  "BURSARY",
  "DIRECTOR",
  "STUDENT",
  "APPLICANT",
]

export const PUBLIC_PAGES = [
  "/",
  "/about",
  "/privacy",
  "/terms",
  "/auth/signin",
  "/auth/signup",
  "/auth/forgot-password",
]

function intEnv(name, fallback) {
  const raw = process.env[name]
  if (raw === undefined || raw === "") return fallback
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(`${name} must be a non-negative number (got "${raw}")`)
  }
  return n
}

/** Hosts that are clearly a developer machine or private network. */
function isLocalHost(hostname) {
  const h = hostname.replace(/^\[|\]$/g, "").toLowerCase()
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local"))
    return true
  if (h === "::1" || h === "0.0.0.0") return true
  if (/^127\./.test(h) || /^10\./.test(h) || /^192\.168\./.test(h)) return true
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true
  return false
}

/**
 * Validates SMOKE_BASE_URL. Throws (refusing to run) when it is missing,
 * malformed, or points anywhere other than a local/private host without
 * SMOKE_ALLOW_REMOTE=1.
 */
export function resolveBaseUrl() {
  const raw = (process.env.SMOKE_BASE_URL ?? "").trim()
  if (!raw) {
    throw new Error(
      "SMOKE_BASE_URL is required (e.g. http://localhost:3031). There is no default, on purpose."
    )
  }
  let url
  try {
    url = new URL(raw)
  } catch {
    throw new Error(`SMOKE_BASE_URL is not a valid URL: "${raw}"`)
  }
  if (!/^https?:$/.test(url.protocol)) {
    throw new Error(`SMOKE_BASE_URL must be http(s): "${raw}"`)
  }
  if (!isLocalHost(url.hostname) && process.env.SMOKE_ALLOW_REMOTE !== "1") {
    throw new Error(
      `Refusing to run against "${url.origin}" — it does not look like a local server and may be production. ` +
        "Set SMOKE_ALLOW_REMOTE=1 if you really mean it (the suite is read-only, but it still signs in as real users)."
    )
  }
  return url.origin
}

/**
 * Which roles to run: SMOKE_ROLES="DEAN,HOD" limits the run; SMOKE_ROLES=none
 * runs public pages only. Each selected role carries its credentials or the
 * reason it will be skipped.
 */
export function resolveRoles() {
  const filter = (process.env.SMOKE_ROLES ?? "").trim().toUpperCase()
  let selected = SMOKE_ROLES
  if (filter === "NONE") {
    selected = []
  } else if (filter) {
    const wanted = filter.split(/[\s,]+/).filter(Boolean)
    const unknown = wanted.filter((r) => !SMOKE_ROLES.includes(r))
    if (unknown.length) {
      throw new Error(
        `SMOKE_ROLES has unknown role(s): ${unknown.join(", ")}. Valid: ${SMOKE_ROLES.join(", ")}, or "none".`
      )
    }
    selected = SMOKE_ROLES.filter((r) => wanted.includes(r))
  }
  return selected.map((role) => {
    const email = process.env[`SMOKE_${role}_EMAIL`]?.trim()
    const password = process.env[`SMOKE_${role}_PASSWORD`]
    const skip =
      email && password
        ? false
        : `no credentials: set SMOKE_${role}_EMAIL and SMOKE_${role}_PASSWORD to test ${role}`
    return { role, email, password, skip }
  })
}

export const timing = {
  /** page.goto timeout — generous because a cold dev server compiles on first hit. */
  navTimeout: intEnv("SMOKE_NAV_TIMEOUT_MS", 120_000),
  /** Extra settle time after network idle, for client-side fetches to land. */
  settle: intEnv("SMOKE_SETTLE_MS", 2_500),
  /** How long a spinner may stay in <main> before the page counts as stuck. */
  spinnerTimeout: intEnv("SMOKE_SPINNER_TIMEOUT_MS", 20_000),
  /** How many other roles' home routes to probe for isolation. */
  isolationCount: intEnv("SMOKE_ISOLATION_COUNT", 4),
  /** Minimum visible characters in <main> before it counts as blank. */
  minMainText: intEnv("SMOKE_MIN_MAIN_TEXT", 15),
}

export const headed = process.env.SMOKE_HEADED === "1"

export function outputDir() {
  const base = process.env.SMOKE_OUTPUT_DIR
    ? path.resolve(process.env.SMOKE_OUTPUT_DIR)
    : path.join(REPO_ROOT, "tests", "smoke", ".output")
  const stamp = new Date().toISOString().replace(/[:.]/g, "-")
  return path.join(base, stamp)
}
