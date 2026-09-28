import type { NotificationItem } from "../types"

export interface NotificationLink {
  href: string
  label: string
}

const STAFF_AREAS = new Set(["admin", "manager"])

/**
 * Where an automatic notification should take its reader
 * (sandbox/automation §4). The server only names the thing (`ref`), because
 * the route depends on the reader's dashboard: `area` is the first segment of
 * the current path ("student", "tutor", "admin", "manager"…). Returns null
 * when there's nothing to link, or no screen for this reader.
 */
export function notificationLink(
  n: Pick<NotificationItem, "event" | "ref">,
  area: string
): NotificationLink | null {
  const ref = n.ref
  if (!ref) return null
  const staff = STAFF_AREAS.has(area)
  const base = `/${area}`

  switch (ref.type) {
    case "semester":
      if (n.event === "READINESS_DIGEST")
        return staff
          ? { href: `${base}/progression/rollover`, label: "Open rollover" }
          : null
      if (area === "student")
        return { href: "/student/results", label: "View my results" }
      if (area === "tutor")
        return { href: "/tutor/results", label: "Open results" }
      return staff
        ? { href: `${base}/grades/results`, label: "Open results" }
        : null
    case "session":
      return staff
        ? {
            href: `${base}/progression/session-close`,
            label: "Open session close",
          }
        : null
    case "invoice":
      if (area === "student")
        return { href: `/student/fees/${ref.id}`, label: "View invoice" }
      return staff
        ? { href: `${base}/finance/fees/invoices`, label: "Open invoices" }
        : null
    case "offering":
      if (area === "tutor")
        return { href: `/tutor/results/${ref.id}`, label: "Open result sheet" }
      return staff
        ? {
            href: `${base}/grades/results/${ref.id}`,
            label: "Open result sheet",
          }
        : null
    case "category_mapping":
      return area === "admin"
        ? {
            href: "/admin/moodle-sync/categories",
            label: "Open Moodle categories",
          }
        : null
    case "promotion_run":
      return staff
        ? {
            href: `${base}/progression/runs/${ref.id}`,
            label: "Open promotion run",
          }
        : null
    default:
      return null
  }
}
