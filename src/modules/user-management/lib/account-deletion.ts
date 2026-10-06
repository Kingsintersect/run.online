import type { User } from "@/types/users"
import { accountStatusOf } from "./account-status"

// What the "Delete account" row action should do for one row.
//   hidden    — not offered (own account, a super_admin account, or the
//               super_admin check couldn't be made yet)
//   deleted   — already deleted; shown disabled as "Already deleted"
//   available — can be deleted
export type DeleteActionState = "hidden" | "deleted" | "available"

export type DeleteActionTarget = Pick<
  User,
  "id" | "is_active" | "email" | "deleted_at"
> & {
  // Present on GET /users rows; the nested `user` on student/tutor/staff
  // rows has no roles, so super_admin ids are looked up separately.
  roles?: string[]
}

// Role names come back as bare strings ("super_admin"); normalise spacing,
// case and hyphens so "Super Admin" / "super-admin" are caught too.
export function isSuperAdminRoleName(role: string): boolean {
  return (
    role
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_") === "super_admin"
  )
}

export function deleteActionStateFor(
  target: DeleteActionTarget,
  ctx: {
    currentUserId: string | null
    superAdminIds: ReadonlySet<number>
    // false until the all-users list has loaded; rows without their own
    // roles stay hidden until then rather than risk offering the action on
    // a super_admin account.
    superAdminIdsKnown: boolean
  }
): DeleteActionState {
  if (ctx.currentUserId !== null && String(target.id) === ctx.currentUserId) {
    return "hidden"
  }
  if (target.roles) {
    if (target.roles.some(isSuperAdminRoleName)) return "hidden"
  } else if (!ctx.superAdminIdsKnown || ctx.superAdminIds.has(target.id)) {
    return "hidden"
  }
  return accountStatusOf(target) === "deleted" ? "deleted" : "available"
}

// What the confirmation dialog shows for the account being deleted.
export interface DeletableAccount {
  id: number
  name: string
  email: string
}

export function deletableAccountOf(
  user: Pick<User, "id" | "email" | "username" | "first_name" | "last_name">
): DeletableAccount {
  const name = `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim()
  return { id: user.id, name: name || user.username, email: user.email }
}
