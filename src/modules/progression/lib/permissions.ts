import type { PermissionCheck } from "@/lib/permissions/usePermissions"

// Permission names exactly as the shared contract's endpoint table lists them
// (session-promotion-frontend-prompt.md). `"a.b.c"` splits on the FIRST dot
// into `{resource: "a", action: "b.c"}`, matching how the session stores them.
// Every progression gate reads from this map, so a backend rename is a
// one-line change here.
export const PROGRESSION_PERMISSIONS = {
  policyView: { resource: "progression", action: "policy.view" },
  policyManage: { resource: "progression", action: "policy.manage" },
  readinessView: { resource: "progression", action: "readiness.view" },
  /** Lock/activate a semester or a session. */
  sessionLock: { resource: "progression", action: "session.lock" },
  /** Create a run, refresh its preview, discard it. */
  runCreate: { resource: "progression", action: "run.create" },
  runView: { resource: "progression", action: "run.view" },
  runOverride: { resource: "progression", action: "run.override" },
  runCommit: { resource: "progression", action: "run.commit" },
  runReverse: { resource: "progression", action: "run.reverse" },
  standingsView: { resource: "standings", action: "view" },
  standingsDebtOverride: { resource: "standings", action: "debt_override" },
  invoicesWaive: { resource: "invoices", action: "waive" },
} as const satisfies Record<string, PermissionCheck>

export type ProgressionPermissionKey = keyof typeof PROGRESSION_PERMISSIONS

/** `"resource.action"` string form, for `<RoleGuard permissions={[...]}>`. */
export function progressionPermissionName(
  key: ProgressionPermissionKey
): string {
  const p = PROGRESSION_PERMISSIONS[key]
  return `${p.resource}.${p.action}`
}
