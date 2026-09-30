import StatusBadge from "@/components/custom/StatusBadge"
import type { User } from "@/types/users"
import {
  ACCOUNT_STATUS_LABEL,
  accountStatusOf,
  type AccountStatus,
} from "../lib/account-status"

const VARIANT: Record<AccountStatus, "success" | "warning" | "destructive"> = {
  active: "success",
  inactive: "warning",
  deleted: "destructive",
}

// Active / Inactive (deactivated, reversible) / Deleted (login revoked,
// record kept). See lib/account-status.ts.
export function AccountStatusBadge({
  user,
}: {
  user: Pick<User, "is_active" | "email" | "deleted_at">
}) {
  const status = accountStatusOf(user)
  return (
    <span
      title={
        status === "deleted"
          ? "Login access was revoked. The record and its history are kept."
          : undefined
      }
    >
      <StatusBadge
        label={ACCOUNT_STATUS_LABEL[status]}
        variant={VARIANT[status]}
        dot
      />
    </span>
  )
}
