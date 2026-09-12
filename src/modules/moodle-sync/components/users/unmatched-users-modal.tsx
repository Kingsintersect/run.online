"use client"

import Modal from "@/components/custom/Modal"
import type { UnmatchedMoodleUser } from "../../types"

interface UnmatchedUsersModalProps {
  open: boolean
  onClose: () => void
  unmatched: UnmatchedMoodleUser[]
}

// Moodle users pulled in but not matched to a portal account (matched by
// email) — they exist on the LMS with no corresponding portal user, so
// there's nothing to push/pull past this point until a portal account with
// the same email is created.
function displayName(
  username: string,
  firstName?: string | null,
  lastName?: string | null
) {
  // `firstName`/`lastName` aren't shipped by the backend yet (see
  // moodle_sync_BACKEND_GAPS.md §5) — this already prefers them the moment
  // they show up in the response, no code change needed then.
  const fullName = [firstName, lastName].filter(Boolean).join(" ")
  return fullName || username
}

export function UnmatchedUsersModal({
  open,
  onClose,
  unmatched,
}: UnmatchedUsersModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Unmatched Moodle Users"
      subtitle="Exist on Moodle but have no matching portal account (matched by email). Create a portal account with the same email, then pull again."
      size="lg"
    >
      <div className="overflow-hidden rounded-xl border border-border">
        <div className="grid grid-cols-[0.7fr_1.1fr_1.1fr_0.8fr] gap-3 border-b border-border bg-muted/20 px-4 py-2.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
          <span>Moodle ID</span>
          <span>Name</span>
          <span>Email</span>
          <span>Moodle Role</span>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {unmatched.map((u) => (
            <div
              key={u.moodleUserId}
              className="grid grid-cols-[0.7fr_1.1fr_1.1fr_0.8fr] items-center gap-3 border-b border-border/60 px-4 py-2.5 text-sm last:border-none"
            >
              <span className="text-muted-foreground">{u.moodleUserId}</span>
              <span className="truncate font-medium text-foreground">
                {displayName(u.username, u.firstName, u.lastName)}
              </span>
              <span className="truncate text-muted-foreground">{u.email}</span>
              <span className="text-xs text-muted-foreground">
                {u.moodleRole}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  )
}
