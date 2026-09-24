import type { PermissionCheck } from "@/lib/permissions/usePermissions"

// Contract C6 permissions, as seeded in the live `permissions` table
// (2026-09-24). Existing names were reused where an equivalent already
// existed: `my-results.view` stands in for C6's `results.view.own`, and
// `grades-summary.view` for `results.analytics.view` (see
// sandbox/results-moodle/AUDIT.md §11). Every results gate in the app reads
// from this map, so a backend rename is a one-line change here.
export const RESULTS_PERMISSIONS = {
  view: { resource: "results", action: "view" },
  viewOwn: { resource: "my-results", action: "view" },
  sync: { resource: "results", action: "sync" },
  itemsMap: { resource: "results", action: "items.map" },
  adjust: { resource: "results", action: "adjust" },
  adjustApprove: { resource: "results", action: "adjust.approve" },
  submit: { resource: "results", action: "submit" },
  approve: { resource: "results", action: "approve" },
  reopen: { resource: "results", action: "reopen" },
  publish: { resource: "results", action: "publish" },
  amendPublished: { resource: "results", action: "amend_published" },
  schemesManage: { resource: "results", action: "schemes.manage" },
  policiesManage: { resource: "results", action: "policies.manage" },
  analyticsView: { resource: "grades-summary", action: "view" },
  export: { resource: "results", action: "export" },
} as const satisfies Record<string, PermissionCheck>

export type ResultsPermissionKey = keyof typeof RESULTS_PERMISSIONS

/** `"resource.action"` string form, for `<RoleGuard permissions={[...]}>`. */
export function permissionName(key: ResultsPermissionKey): string {
  const p = RESULTS_PERMISSIONS[key]
  return `${p.resource}.${p.action}`
}
