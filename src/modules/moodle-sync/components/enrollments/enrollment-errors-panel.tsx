"use client"

import { AlertTriangle, Loader2, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import EmptyState from "@/components/custom/EmptyState"
import { PermissionGate } from "@/lib/permissions/PermissionGate"
import { useSyncEnrollmentErrors } from "../../hooks/use-sync-enrollments"
import { usePushEnrollment } from "../../hooks/use-sync-mutations"

export function EnrollmentErrorsPanel() {
  const { data = [], isLoading, isError } = useSyncEnrollmentErrors()
  const retry = usePushEnrollment()

  const handleRetry = async (enrollmentId: number) => {
    try {
      await retry.mutateAsync(enrollmentId)
      toast.success("Enrollment re-synced")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Retry failed")
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-muted/40" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <EmptyState
        title="Couldn't load enrollment errors"
        description="Please try again."
      />
    )
  }

  if (data.length === 0) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="No failed enrollment syncs"
        description="All enrollment syncs are healthy. Failures will show up here with retry actions."
      />
    )
  }

  return (
    <div className="space-y-3">
      {data.map((enrollment) => (
        <div
          key={enrollment.id}
          className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">
                {enrollment.studentName} → {enrollment.courseCode}
              </p>
              <p className="mt-1 text-xs text-destructive">
                {enrollment.syncError}
              </p>
            </div>
            <PermissionGate
              require={{ resource: "moodle-sync", action: "push" }}
            >
              <Button
                variant="outline"
                size="sm"
                className="h-7 shrink-0 gap-1 text-xs"
                disabled={retry.isPending}
                onClick={() => handleRetry(enrollment.studentEnrollmentId)}
              >
                {retry.isPending ? (
                  <Loader2 size={11} className="animate-spin" />
                ) : (
                  <RefreshCw size={11} />
                )}
                Retry
              </Button>
            </PermissionGate>
          </div>
        </div>
      ))}
    </div>
  )
}
