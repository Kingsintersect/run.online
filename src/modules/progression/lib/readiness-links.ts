import type { ReadinessIssue } from "../types"

// Where each readiness blocker/warning can be fixed. `base` is the dashboard
// root the admin is working in ("/admin" or "/manager"), so a link never
// sends a manager into the super-admin tree. Codes without a fixing screen
// (e.g. SESSION_NOT_LOCKED, fixed by the Lock action on the same page)
// return null and render as plain text.

/** "/admin" or "/manager" — the first segment of the current path. */
export function dashboardBase(pathname: string): string {
  const first = pathname.split("/")[1]
  return first ? `/${first}` : "/admin"
}

type ContextValue = NonNullable<ReadinessIssue["context"]>[string]

function firstId(value: ContextValue | undefined): number | null {
  const raw = Array.isArray(value) ? value[0] : value
  const n = typeof raw === "string" ? Number(raw) : raw
  return typeof n === "number" && Number.isInteger(n) && n > 0 ? n : null
}

function idCount(value: ContextValue | undefined): number {
  return Array.isArray(value) ? value.length : value == null ? 0 : 1
}

export interface ReadinessLink {
  href: string
  label: string
}

export function readinessIssueLink(
  issue: ReadinessIssue,
  base: string
): ReadinessLink | null {
  const ctx = issue.context ?? {}
  switch (issue.code) {
    case "RESULT_SHEETS_NOT_APPROVED":
    case "GRADES_MISSING":
    case "RESULTS_NOT_PUBLISHED":
    case "GRADE_PULL_RUNNING": {
      // One offering → open its sheet directly; several → the sheet list.
      const offeringId =
        idCount(ctx.offering_ids) === 1
          ? firstId(ctx.offering_ids)
          : firstId(ctx.offering_id)
      return offeringId
        ? {
            href: `${base}/grades/results/${offeringId}`,
            label: "Open result sheet",
          }
        : { href: `${base}/grades/results`, label: "Go to result sheets" }
    }
    case "GRADE_ADJUSTMENTS_PENDING":
      return {
        href: `${base}/grades/approvals`,
        label: "Review grade adjustments",
      }
    case "CGPA_NOT_COMPUTED":
      return {
        href: `${base}/grades/publish-results`,
        label: "Go to publish results",
      }
    case "TARGET_SESSION_INCOMPLETE":
      return {
        href: `${base}/academics/academic-year`,
        label: "Set up sessions & semesters",
      }
    case "TARGET_OFFERINGS_MISSING":
      return {
        href: `${base}/academics/courses-management`,
        label: "Manage course offerings",
      }
    case "TARGET_FEE_TYPES_MISSING": {
      const feeTypeId = firstId(ctx.fee_type_id)
      return feeTypeId
        ? {
            href: `${base}/finance/fees/types/${feeTypeId}`,
            label: "Open fee type",
          }
        : { href: `${base}/finance/fees/types`, label: "Manage fee types" }
    }
    case "RUN_ALREADY_ACTIVE": {
      const runId = firstId(ctx.run_id) ?? firstId(ctx.promotion_run_id)
      return runId
        ? {
            href: `${base}/progression/runs/${runId}`,
            label: "Open the active run",
          }
        : { href: `${base}/progression/runs`, label: "Go to promotion runs" }
    }
    default:
      return null
  }
}
