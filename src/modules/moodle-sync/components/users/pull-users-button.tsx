"use client"

import { useState } from "react"
import { toast } from "sonner"
import { AlertTriangle, Download, Loader2, UserX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PermissionGate } from "@/lib/permissions/PermissionGate"
import { usePullUsers } from "../../hooks/use-sync-mutations"
import { useUnmatchedMoodleUsers } from "../../hooks/use-sync-users"
import { UnmatchedUsersModal } from "./unmatched-users-modal"
import { SkippedUsersModal } from "./skipped-users-modal"
import type { PullUsersResult } from "../../types"

// Encapsulates the "Pull from Moodle" action and its result — the pulled
// batch's unmatched/skipped detail is ephemeral (only known right after a
// pull), so it's local state here rather than React Query cache or the
// Zustand UI store.
export function PullUsersButton() {
  const pullUsers = usePullUsers()
  const [result, setResult] = useState<PullUsersResult | null>(null)
  const [showUnmatched, setShowUnmatched] = useState(false)
  const [showSkipped, setShowSkipped] = useState(false)

  // Standing unmatched list — shown when no pull has run this session yet.
  // A completed pull's own `unmatched` is fresher, so it takes precedence.
  const standingUnmatched = useUnmatchedMoodleUsers()

  const handlePullAll = async () => {
    try {
      const nextResult = await pullUsers.mutateAsync()
      setResult(nextResult)
      toast.success(
        `Matched ${nextResult.matched} user(s), ${nextResult.skipped} skipped, ${nextResult.unmatched.length} unmatched`
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Pull failed")
    }
  }

  const unmatched = result?.unmatched ?? standingUnmatched.data ?? []
  const skippedCount = result?.skipped ?? 0

  return (
    <>
      <div className="flex items-center gap-2">
        <PermissionGate require={{ resource: "moodle-sync", action: "pull" }}>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            disabled={pullUsers.isPending}
            onClick={handlePullAll}
          >
            {pullUsers.isPending ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Download size={13} />
            )}
            Pull from Moodle
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            disabled={skippedCount === 0}
            title={
              skippedCount === 0
                ? "No skipped users from the last pull"
                : "View Moodle users skipped during the last pull"
            }
            onClick={() => setShowSkipped(true)}
          >
            <AlertTriangle size={13} />
            Skipped{skippedCount > 0 ? ` (${skippedCount})` : ""}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            disabled={unmatched.length === 0}
            title={
              unmatched.length === 0
                ? "No unmatched Moodle users"
                : "View Moodle users with no matching portal account"
            }
            onClick={() => setShowUnmatched(true)}
          >
            <UserX size={13} />
            Unmatched{unmatched.length > 0 ? ` (${unmatched.length})` : ""}
          </Button>
        </PermissionGate>
      </div>

      <SkippedUsersModal
        open={showSkipped}
        onClose={() => setShowSkipped(false)}
        skippedCount={skippedCount}
        skippedUsers={result?.skippedUsers ?? undefined}
      />
      <UnmatchedUsersModal
        open={showUnmatched}
        onClose={() => setShowUnmatched(false)}
        unmatched={unmatched}
      />
    </>
  )
}
