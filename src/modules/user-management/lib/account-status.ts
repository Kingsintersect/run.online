import type { User } from "@/types/users"

export type AccountStatus = "active" | "inactive" | "deleted"

// DELETE /users/:id (bruno/user/Users - Delete.bru, redefined 2026-09-28)
// revokes login and keeps the row: `deletedAt` is set, `isActive` goes false,
// and the email becomes `deleted_user_{id}_<random>@deleted.local`. A plain
// deactivation (PATCH isActive=false) leaves email and deletedAt untouched.
// `deletedAt` is documented on Users list/show; nested user objects on the
// student/tutor/staff lists may not carry it, so the documented placeholder
// email is used as a fallback signal there.
const DELETED_EMAIL_SUFFIX = "@deleted.local"

type AccountFields = Pick<User, "is_active" | "email" | "deleted_at">

export function accountStatusOf(user: AccountFields): AccountStatus {
  if (user.deleted_at || user.email.endsWith(DELETED_EMAIL_SUFFIX)) {
    return "deleted"
  }
  return user.is_active ? "active" : "inactive"
}

export const ACCOUNT_STATUS_LABEL: Record<AccountStatus, string> = {
  active: "Active",
  inactive: "Inactive",
  deleted: "Deleted",
}
