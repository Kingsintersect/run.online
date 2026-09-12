"use client"

import Modal from "@/components/custom/Modal"
import type { SkippedMoodleUser } from "../../types"

interface SkippedUsersModalProps {
  open: boolean
  onClose: () => void
  /** Always accurate, even when `skippedUsers` detail isn't available yet. */
  skippedCount: number
  /**
   * Per-record detail — not shipped by the backend yet (see
   * moodle_sync_BACKEND_GAPS.md §5). `undefined`/empty just means "not
   * available yet," not "nothing was skipped" — see `skippedCount`.
   */
  skippedUsers: SkippedMoodleUser[] | undefined
}

export function SkippedUsersModal({
  open,
  onClose,
  skippedCount,
  skippedUsers,
}: SkippedUsersModalProps) {
  const hasDetail = !!skippedUsers && skippedUsers.length > 0

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Skipped Moodle Users"
      subtitle="Found on Moodle but intentionally not synced (already matched, disallowed role, duplicate email, etc.)."
      size="lg"
    >
      {hasDetail ? (
        <div className="overflow-hidden rounded-xl border border-border">
          <div className="grid grid-cols-[1fr_1fr_0.7fr_1.2fr] gap-3 border-b border-border bg-muted/20 px-4 py-2.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            <span>Username</span>
            <span>Email</span>
            <span>Moodle Role</span>
            <span>Reason</span>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {skippedUsers?.map((u) => (
              <div
                key={u.moodleUserId}
                className="grid grid-cols-[1fr_1fr_0.7fr_1.2fr] items-center gap-3 border-b border-border/60 px-4 py-2.5 text-sm last:border-none"
              >
                <span className="truncate font-medium text-foreground">
                  {u.username}
                </span>
                <span className="truncate text-muted-foreground">
                  {u.email}
                </span>
                <span className="text-xs text-muted-foreground">
                  {u.moodleRole}
                </span>
                <span className="truncate text-muted-foreground">
                  {u.reason}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          {skippedCount} user{skippedCount === 1 ? "" : "s"} were skipped on the
          last pull, but the sync API doesn&apos;t return per-user detail yet —
          only the count. This will populate automatically once the backend adds
          it.
        </p>
      )}
    </Modal>
  )
}
