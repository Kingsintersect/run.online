import type { NavGroup, NavItem } from "@/config/nav.config"
import type { PermissionCheck } from "./usePermissions"

// Drops nav items whose `permission` the session doesn't hold (and groups or
// parent items left empty). Items without a `permission` are unaffected, so
// every existing nav tree behaves exactly as before. Complements the
// feature-flag filter in lib/feature-flags/featureAccess.ts.
function filterItems(
  items: NavItem[],
  can: (check: PermissionCheck) => boolean
): NavItem[] {
  const out: NavItem[] = []
  for (const item of items) {
    if (item.permission) {
      const checks = Array.isArray(item.permission)
        ? item.permission
        : [item.permission]
      if (!checks.some(can)) continue
    }
    const children = item.children ? filterItems(item.children, can) : undefined
    if (item.children && !item.href && (!children || children.length === 0))
      continue
    out.push({ ...item, children })
  }
  return out
}

export function filterNavGroupsByPermission(
  groups: NavGroup[],
  can: (check: PermissionCheck) => boolean
): NavGroup[] {
  return groups
    .map((group) => ({ ...group, items: filterItems(group.items, can) }))
    .filter((group) => group.items.length > 0)
}
