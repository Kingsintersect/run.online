import type { NavGroup, NavItem } from "@/config/nav.config"
import type { FeatureFlagMap } from "@/schemas/featureFlags.schema"

type RouteFeatureRule = {
  prefix: string
  feature: string
}

const ROUTE_FEATURE_RULES: RouteFeatureRule[] = [
  {
    prefix: "/admin/configurations/feature-registry",
    feature: "portal_settings",
  },
  {
    prefix: "/admin/configurations/feature-access",
    feature: "portal_settings",
  },
  { prefix: "/admin/system/portal", feature: "portal_settings" },
  { prefix: "/admin/system/config", feature: "system_configuration" },

  { prefix: "/admin/audit", feature: "audit" },

  { prefix: "/manager/analytics", feature: "analytics" },
  { prefix: "/admin/system/analytics", feature: "analytics" },

  { prefix: "/student/settings", feature: "profile_settings" },
  { prefix: "/tutor/settings", feature: "profile_settings" },
  { prefix: "/manager/settings", feature: "profile_settings" },
  { prefix: "/admin/account/settings", feature: "profile_settings" },

  { prefix: "/admin/timetable", feature: "calendar_timetable_sync" },
  { prefix: "/student/timetable", feature: "calendar_timetable_sync" },
  { prefix: "/tutor/timetable", feature: "calendar_timetable_sync" },
  { prefix: "/admin/calendar", feature: "calendar_timetable_sync" },

  { prefix: "/admin/notification", feature: "notifications" },
  { prefix: "/student/notifications", feature: "notifications" },
  { prefix: "/tutor/notifications", feature: "notifications" },
  { prefix: "/manager/announcements", feature: "notifications" },
  { prefix: "/manager/messages", feature: "notifications" },

  { prefix: "/admin/academics/academic-year", feature: "session_semester" },
  { prefix: "/manager/academics/academic-year", feature: "session_semester" },

  { prefix: "/admin/grades", feature: "grading" },
  { prefix: "/manager/grades", feature: "grading" },
  { prefix: "/tutor/grading", feature: "grading" },
  { prefix: "/student/results", feature: "grading" },
  { prefix: "/director/grades", feature: "grading" },

  { prefix: "/admin/hostel", feature: "hostel_management" },
  { prefix: "/manager/hostel", feature: "hostel_management" },
  { prefix: "/student/hostel", feature: "hostel_management" },

  { prefix: "/admin/assessments/sync-status", feature: "course_sync" },

  {
    prefix: "/admin/academics/course-structure",
    feature: "program_management",
  },
  {
    prefix: "/manager/academics/course-structure",
    feature: "program_management",
  },
  {
    prefix: "/admin/academics/courses-management",
    feature: "program_management",
  },
  {
    prefix: "/manager/academics/courses-management",
    feature: "program_management",
  },
  { prefix: "/student/courses", feature: "program_management" },
  { prefix: "/tutor/courses", feature: "program_management" },

  { prefix: "/admin/users", feature: "user_management" },
  { prefix: "/manager/users", feature: "user_management" },

  { prefix: "/manager/finance/fees", feature: "fee_management" },
  { prefix: "/admin/finance/fees", feature: "fee_management" },

  { prefix: "/manager/finance", feature: "payment" },
  { prefix: "/admin/finance", feature: "payment" },
  { prefix: "/student/fees", feature: "payment" },

  { prefix: "/manager/review-applications", feature: "admission" },
  { prefix: "/manager/academics/admissions", feature: "admission" },
  { prefix: "/admin/academics/admissions", feature: "admission" },
  { prefix: "/student/my-application", feature: "admission" },
  { prefix: "/process-admission", feature: "admission" },
]

const SORTED_RULES = [...ROUTE_FEATURE_RULES].sort(
  (a, b) => b.prefix.length - a.prefix.length
)

function normalizePath(path: string): string {
  if (!path) return "/"
  const trimmed = path.endsWith("/") && path !== "/" ? path.slice(0, -1) : path
  return trimmed.toLowerCase()
}

export function getFeatureForPath(path: string): string | null {
  const normalized = normalizePath(path)
  const rule = SORTED_RULES.find(
    (entry) =>
      normalized === entry.prefix.toLowerCase() ||
      normalized.startsWith(`${entry.prefix.toLowerCase()}/`)
  )
  return rule?.feature ?? null
}

export function isFeatureEnabled(
  featureKey: string,
  flags?: FeatureFlagMap
): boolean {
  if (!flags) return true
  return flags[featureKey] ?? true
}

export function canAccessPath(path: string, flags?: FeatureFlagMap): boolean {
  const feature = getFeatureForPath(path)
  if (!feature) return true
  return isFeatureEnabled(feature, flags)
}

function filterNavItems(items: NavItem[], flags?: FeatureFlagMap): NavItem[] {
  const filtered: NavItem[] = []

  for (const item of items) {
    const nextChildren = item.children
      ? filterNavItems(item.children, flags)
      : undefined

    if (item.href && !canAccessPath(item.href, flags)) {
      continue
    }

    if (
      item.children &&
      (!nextChildren || nextChildren.length === 0) &&
      !item.href
    ) {
      continue
    }

    filtered.push({
      ...item,
      children: nextChildren,
    })
  }

  return filtered
}

export function filterNavGroupsByFeatureFlags(
  groups: NavGroup[],
  flags?: FeatureFlagMap
): NavGroup[] {
  return groups
    .map((group) => ({
      ...group,
      items: filterNavItems(group.items, flags),
    }))
    .filter((group) => group.items.length > 0)
}
