"use client"

import { Loader2, UploadCloud, Link2 } from "lucide-react"
import { toast } from "sonner"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import EmptyState from "@/components/custom/EmptyState"
import { PermissionGate } from "@/lib/permissions/PermissionGate"
import { useSyncEnrollments } from "../../hooks/use-sync-enrollments"
import {
  usePushEnrollment,
  usePushAllEnrollments,
} from "../../hooks/use-sync-mutations"
import { SyncStatusBadge } from "../shared/sync-status-badge"
import { PushPullToolbar } from "../shared/push-pull-toolbar"

export function EnrollmentSyncTable() {
  const { data = [], isLoading, isError } = useSyncEnrollments()
  const pushEnrollment = usePushEnrollment()
  const pushAll = usePushAllEnrollments()

  const handlePush = async (enrollmentId: number) => {
    try {
      await pushEnrollment.mutateAsync(enrollmentId)
      toast.success("Enrollment pushed to Moodle")
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to push enrollment"
      )
    }
  }

  const handlePushAll = async () => {
    try {
      const result = await pushAll.mutateAsync()
      toast.success(`${result.pushed} pending enrollment(s) pushed`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bulk push failed")
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-xl bg-muted/40" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <EmptyState
        title="Couldn't load enrollment sync records"
        description="Please try again."
      />
    )
  }

  return (
    <div className="space-y-3">
      <PushPullToolbar
        title="Enrollment Sync"
        subtitle="Push all pending enrollments as a background job."
        onPush={handlePushAll}
        pushLabel="Push All Pending"
        pushPending={pushAll.isPending}
      />

      {data.length === 0 ? (
        <EmptyState
          icon={Link2}
          title="No enrollment sync records"
          description="Enrollments will appear here as students are pushed."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="grid grid-cols-[1.3fr_0.9fr_1fr_auto] items-center gap-3 border-b border-border bg-muted/20 px-4 py-2.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            <span>Student</span>
            <span>Course</span>
            <span>Status</span>
            <span className="text-right">Action</span>
          </div>

          {data.map((enrollment, idx) => (
            <motion.div
              key={enrollment.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: idx * 0.03 }}
              className="grid grid-cols-[1.3fr_0.9fr_1fr_auto] items-center gap-3 border-b border-border/60 px-4 py-3 last:border-none hover:bg-muted/20"
            >
              <span className="truncate text-sm font-medium text-foreground">
                {enrollment.studentName}
              </span>
              <span className="text-xs text-muted-foreground">
                {enrollment.courseCode}
              </span>
              <div title={enrollment.syncError ?? undefined}>
                <SyncStatusBadge status={enrollment.syncStatus} />
              </div>
              <div className="flex justify-end">
                {enrollment.syncStatus !== "SYNCED" && (
                  <PermissionGate
                    require={{ resource: "moodle-sync", action: "push" }}
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1 text-xs"
                      disabled={pushEnrollment.isPending}
                      onClick={() => handlePush(enrollment.studentEnrollmentId)}
                    >
                      {pushEnrollment.isPending ? (
                        <Loader2 size={11} className="animate-spin" />
                      ) : (
                        <UploadCloud size={11} />
                      )}
                      {enrollment.syncStatus === "FAILED" ? "Retry" : "Push"}
                    </Button>
                  </PermissionGate>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
