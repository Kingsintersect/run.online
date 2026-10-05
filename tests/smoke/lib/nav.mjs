/**
 * Role routes come from the app's own src/config/nav.config.ts — never
 * hardcoded here — so a template sync that moves a dashboard is picked up
 * automatically.
 *
 * Primary path: import the real module (the npm script runs Node with
 * --experimental-transform-types, which handles its `enum`). Fallback: if the
 * import fails (e.g. nav.config.ts later imports an "@/..." alias Node can't
 * resolve), parse `roleDashboardPath` out of the source text. In fallback mode
 * the sidebar is still read from the live DOM; only the nav-tree cross-check
 * and the isolation allow-list are less precise.
 */
import fs from "node:fs"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { REPO_ROOT } from "./config.mjs"

const NAV_FILE = path.join(REPO_ROOT, "src", "config", "nav.config.ts")

/**
 * Areas a role can open by layout <RoleGuard> but has no nav link into, so
 * they can't be derived from navConfig. Mirrors src/app/(dashboard)/<area>/layout.tsx;
 * update it if those layouts change.
 *   - director/layout.tsx allows SUPER_ADMIN
 *   - tutor/layout.tsx allows DEAN
 *   - (admission)/layout.tsx allows STUDENT and APPLICANT on /process-admission
 */
const EXTRA_ALLOWED_SEGMENTS = {
  SUPER_ADMIN: ["director"],
  DEAN: ["tutor"],
  STUDENT: ["process-admission"],
  APPLICANT: ["process-admission"],
}

export const firstSegment = (p) =>
  p.split(/[?#]/)[0].split("/").filter(Boolean)[0] ?? ""

function collectHrefs(items) {
  return items.flatMap((i) => [
    ...(i.href ? [i.href] : []),
    ...collectHrefs(i.children ?? []),
  ])
}

function parseFallback() {
  const src = fs.readFileSync(NAV_FILE, "utf8")
  const block = src.match(/export const roleDashboardPath[^{]*\{([\s\S]*?)\n\}/)
  if (!block) throw new Error(`Could not find roleDashboardPath in ${NAV_FILE}`)
  const roleDashboardPath = {}
  for (const m of block[1].matchAll(
    /\[UserRole\.([A-Z_]+)\]\s*:\s*"([^"]+)"/g
  )) {
    roleDashboardPath[m[1]] = m[2]
  }
  return { roleDashboardPath, navConfig: null, resolvePostSignInPath: null }
}

let cached
export async function loadNav() {
  if (cached) return cached
  let mod
  let mode = "import"
  try {
    mod = await import(pathToFileURL(NAV_FILE).href)
  } catch (err) {
    mode = "parsed"
    console.warn(
      `[smoke] Could not import nav.config.ts (${err.message.split("\n")[0]}); falling back to parsing roleDashboardPath.`
    )
    mod = parseFallback()
  }
  const { roleDashboardPath, navConfig, resolvePostSignInPath } = mod

  /** Sidebar hrefs the nav tree defines for a role (before permission filtering). */
  const navHrefs = (role) =>
    navConfig?.[role]
      ? [...new Set(collectHrefs(navConfig[role].flatMap((g) => g.items)))]
      : []

  /** Paths a fresh sign-in may legitimately land on for this role. */
  const homeCandidates = (role) => {
    const set = new Set([roleDashboardPath[role]])
    if (resolvePostSignInPath) set.add(resolvePostSignInPath(role))
    // STUDENT/APPLICANT go through the admission flow first; an admitted,
    // paid-up STUDENT is then forwarded to its dashboard (lib/auth/post-sign-in.ts).
    if (role === "STUDENT" || role === "APPLICANT")
      set.add("/process-admission")
    return [...set].filter(Boolean)
  }

  /** Top-level route segments this role is expected to be allowed into. */
  const allowedSegments = (role) =>
    new Set(
      [...navHrefs(role), ...homeCandidates(role)]
        .map(firstSegment)
        .concat(EXTRA_ALLOWED_SEGMENTS[role] ?? [])
        .filter(Boolean)
    )

  /**
   * Other roles' home routes this role must NOT be able to render — one per
   * distinct area, up to `count`. roleDashboardPath is declared from least to
   * most privileged, so it is walked in reverse: privilege escalation (a
   * lower role opening /admin or /manager) is probed first.
   */
  const isolationTargets = (role, count) => {
    const allowed = allowedSegments(role)
    const seen = new Set()
    const targets = []
    for (const [other, home] of Object.entries(roleDashboardPath).reverse()) {
      if (other === role || !home) continue
      const seg = firstSegment(home)
      if (allowed.has(seg) || seen.has(seg)) continue
      seen.add(seg)
      targets.push({ role: other, path: home })
    }
    return targets.slice(0, count)
  }

  cached = {
    mode,
    roleDashboardPath,
    navHrefs,
    homeCandidates,
    allowedSegments,
    isolationTargets,
  }
  return cached
}
