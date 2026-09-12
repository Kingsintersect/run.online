"use client"

import { Loader2, UploadCloud, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { PermissionGate } from "@/lib/permissions/PermissionGate"
import { useMoodleSyncUiStore } from "../../store/moodle-sync-ui.store"
import { usePushCoursesBulk } from "../../hooks/use-sync-mutations"

export function CourseBulkPushToolbar() {
  const selectedCourseOfferingIds = useMoodleSyncUiStore(
    (s) => s.selectedCourseOfferingIds
  )
  const clearSelectedCourses = useMoodleSyncUiStore(
    (s) => s.clearSelectedCourses
  )
  const pushBulk = usePushCoursesBulk()

  if (selectedCourseOfferingIds.length === 0) return null

  const handlePush = async () => {
    try {
      const result = await pushBulk.mutateAsync({
        courseOfferingIds: selectedCourseOfferingIds,
      })
      toast.success(`${result.pushed} course offering(s) pushed to Moodle`)
      clearSelectedCourses()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bulk push failed")
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/4 px-4 py-2.5">
      <p className="text-xs font-medium text-foreground">
        {selectedCourseOfferingIds.length} selected
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 text-xs"
          onClick={clearSelectedCourses}
        >
          <X size={12} /> Clear
        </Button>
        <PermissionGate require={{ resource: "moodle-sync", action: "push" }}>
          <Button
            size="sm"
            className="h-7 gap-1.5 text-xs"
            disabled={pushBulk.isPending}
            onClick={handlePush}
          >
            {pushBulk.isPending ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <UploadCloud size={12} />
            )}
            Push Selected
          </Button>
        </PermissionGate>
      </div>
    </div>
  )
}
