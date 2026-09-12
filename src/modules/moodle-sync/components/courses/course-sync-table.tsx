"use client"

import { Loader2, UploadCloud, BookOpen } from "lucide-react"
import { toast } from "sonner"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import EmptyState from "@/components/custom/EmptyState"
import { PermissionGate } from "@/lib/permissions/PermissionGate"
import { useSyncCourses } from "../../hooks/use-sync-courses"
import { usePushCourse } from "../../hooks/use-sync-mutations"
import { useMoodleSyncUiStore } from "../../store/moodle-sync-ui.store"
import { SyncStatusBadge } from "../shared/sync-status-badge"
import { CourseBulkPushToolbar } from "./course-bulk-push-toolbar"

export function CourseSyncTable() {
  const { data = [], isLoading, isError } = useSyncCourses()
  const pushCourse = usePushCourse()
  const selectedCourseOfferingIds = useMoodleSyncUiStore(
    (s) => s.selectedCourseOfferingIds
  )
  const toggleCourseSelected = useMoodleSyncUiStore(
    (s) => s.toggleCourseSelected
  )

  const handlePush = async (courseOfferingId: number) => {
    try {
      await pushCourse.mutateAsync(courseOfferingId)
      toast.success("Course pushed to Moodle")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to push course")
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
        title="Couldn't load course sync mappings"
        description="Please try again."
      />
    )
  }

  if (data.length === 0) {
    return (
      <EmptyState
        icon={BookOpen}
        title="No course offerings to sync"
        description="Course offerings will appear here."
      />
    )
  }

  return (
    <div className="space-y-3">
      <CourseBulkPushToolbar />

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="grid grid-cols-[auto_1.4fr_1fr_1fr_auto] items-center gap-3 border-b border-border bg-muted/20 px-4 py-2.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
          <span />
          <span>Course</span>
          <span>Moodle Short Name</span>
          <span>Status</span>
          <span className="text-right">Action</span>
        </div>

        {data.map((course, idx) => (
          <motion.div
            key={course.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: idx * 0.03 }}
            className="grid grid-cols-[auto_1.4fr_1fr_1fr_auto] items-center gap-3 border-b border-border/60 px-4 py-3 last:border-none hover:bg-muted/20"
          >
            <Checkbox
              checked={selectedCourseOfferingIds.includes(
                course.courseOfferingId
              )}
              onCheckedChange={() =>
                toggleCourseSelected(course.courseOfferingId)
              }
              aria-label={`Select ${course.courseCode}`}
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {course.courseCode}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {course.courseTitle}
              </p>
            </div>
            <span className="text-xs text-muted-foreground">
              {course.moodleShortName ?? "—"}
            </span>
            <div>
              <SyncStatusBadge status={course.syncStatus} />
            </div>
            <div className="flex justify-end">
              <PermissionGate
                require={{ resource: "moodle-sync", action: "push" }}
              >
                <Button
                  variant={course.syncStatus === "SYNCED" ? "ghost" : "outline"}
                  size="sm"
                  className="h-7 gap-1 text-xs"
                  disabled={pushCourse.isPending}
                  onClick={() => handlePush(course.courseOfferingId)}
                >
                  {pushCourse.isPending ? (
                    <Loader2 size={11} className="animate-spin" />
                  ) : (
                    <UploadCloud size={11} />
                  )}
                  {course.syncStatus === "SYNCED" ? "Re-push" : "Push"}
                </Button>
              </PermissionGate>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
