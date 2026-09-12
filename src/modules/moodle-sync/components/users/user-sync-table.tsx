"use client"

import { Loader2, UploadCloud } from "lucide-react"
import { toast } from "sonner"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import EmptyState from "@/components/custom/EmptyState"
import { PermissionGate } from "@/lib/permissions/PermissionGate"
import { Users } from "lucide-react"
import { useSyncUsers } from "../../hooks/use-sync-users"
import { usePushUser } from "../../hooks/use-sync-mutations"
import { useMoodleSyncUiStore } from "../../store/moodle-sync-ui.store"
import { SyncStatusBadge } from "../shared/sync-status-badge"
import { UserBulkPushToolbar } from "./user-bulk-push-toolbar"

export function UserSyncTable() {
  const { data = [], isLoading, isError } = useSyncUsers()
  const pushUser = usePushUser()
  const selectedUserIds = useMoodleSyncUiStore((s) => s.selectedUserIds)
  const toggleUserSelected = useMoodleSyncUiStore((s) => s.toggleUserSelected)

  const handlePush = async (userId: number) => {
    try {
      await pushUser.mutateAsync(userId)
      toast.success("User pushed to Moodle")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to push user")
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-xl bg-muted/40" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <EmptyState
        title="Couldn't load user sync mappings"
        description="Please try again."
      />
    )
  }

  if (data.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No users to sync"
        description="Portal users will appear here."
      />
    )
  }

  return (
    <div className="space-y-3">
      <UserBulkPushToolbar />

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="grid grid-cols-[auto_1.4fr_0.7fr_0.9fr_1fr_auto] items-center gap-3 border-b border-border bg-muted/20 px-4 py-2.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
          <span />
          <span>Name / Email</span>
          <span>Portal Role</span>
          <span>Moodle Role</span>
          <span>Status</span>
          <span className="text-right">Action</span>
        </div>

        {data.map((user, idx) => {
          const isStudent = user.portalRole === "STUDENT"
          return (
            <motion.div
              key={user.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: idx * 0.03 }}
              className="grid grid-cols-[auto_1.4fr_0.7fr_0.9fr_1fr_auto] items-center gap-3 border-b border-border/60 px-4 py-3 last:border-none hover:bg-muted/20"
            >
              <Checkbox
                checked={selectedUserIds.includes(user.userId)}
                onCheckedChange={() => toggleUserSelected(user.userId)}
                disabled={isStudent}
                aria-label={`Select ${user.name}`}
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {user.name}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {user.email}
                </p>
              </div>
              <span className="text-xs text-muted-foreground">
                {user.portalRole}
              </span>
              <span className="text-xs text-muted-foreground">
                {user.moodleRole}
              </span>
              <div>
                {isStudent && user.syncStatus === "PENDING" ? (
                  <span className="text-[11px] text-muted-foreground">
                    Awaits payment verification
                  </span>
                ) : (
                  <SyncStatusBadge status={user.syncStatus} />
                )}
              </div>
              <div className="flex justify-end">
                <PermissionGate
                  require={{ resource: "moodle-sync", action: "push" }}
                >
                  <Button
                    variant={user.syncStatus === "SYNCED" ? "ghost" : "outline"}
                    size="sm"
                    className="h-7 gap-1 text-xs"
                    disabled={isStudent || pushUser.isPending}
                    title={
                      isStudent
                        ? "Students sync automatically on tuition verification"
                        : "Push to Moodle"
                    }
                    onClick={() => handlePush(user.userId)}
                  >
                    {pushUser.isPending ? (
                      <Loader2 size={11} className="animate-spin" />
                    ) : (
                      <UploadCloud size={11} />
                    )}
                    {user.syncStatus === "SYNCED" ? "Re-push" : "Push"}
                  </Button>
                </PermissionGate>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
