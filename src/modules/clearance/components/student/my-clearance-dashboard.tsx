"use client"

import { motion } from "framer-motion"
import { toast } from "sonner"
import { ClipboardCheck, Loader2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import EmptyState from "@/components/custom/EmptyState"
import { useMyStudentId } from "@/hooks/use-my-student-id"
import { useClearanceSummary } from "../../hooks/use-clearance"
import {
  useRequestAllClearances,
  useRequestClearance,
} from "../../hooks/use-clearance-mutations"
import { ClearanceStatusBadge } from "../shared/clearance-status-badge"

export function MyClearanceDashboard() {
  const { studentId } = useMyStudentId()
  const { data: summary, isLoading, isError } = useClearanceSummary(studentId)
  const requestOne = useRequestClearance()
  const requestAll = useRequestAllClearances()

  const handleRequest = async (clearanceTypeId: number) => {
    if (!studentId) return
    try {
      await requestOne.mutateAsync({ studentId, clearanceTypeId })
      toast.success("Clearance requested")
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to request clearance"
      )
    }
  }

  const handleRequestAll = async () => {
    if (!studentId) return
    try {
      await requestAll.mutateAsync(studentId)
      toast.success("All clearance requests submitted")
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to request clearance"
      )
    }
  }

  if (!studentId) {
    return (
      <EmptyState
        icon={ClipboardCheck}
        title="Can't load your clearance status yet"
        description="Your student record couldn't be resolved. Try again later."
      />
    )
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

  if (isError || !summary) {
    return (
      <EmptyState
        title="Couldn't load your clearance status"
        description="Please try again."
      />
    )
  }

  const hasUnrequested = summary.clearances.some(
    (c) => c.status === "NOT_REQUESTED"
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Clearance Status
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {summary.totalCleared} of {summary.totalRequired} checkpoints
            cleared
          </p>
        </div>
        {summary.isFullyCleared ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-400">
            <Sparkles size={14} />
            Fully Cleared
          </span>
        ) : (
          hasUnrequested && (
            <Button
              onClick={handleRequestAll}
              disabled={requestAll.isPending}
              size="sm"
            >
              {requestAll.isPending && (
                <Loader2
                  className="size-4 animate-spin"
                  data-icon="inline-start"
                />
              )}
              Request All
            </Button>
          )
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {summary.clearances.map((item, idx) => (
          <motion.div
            key={item.clearanceType.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: idx * 0.03 }}
            className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3.5 last:border-none"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {item.clearanceType.name}
              </p>
              {item.comments && (
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {item.comments}
                </p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <ClearanceStatusBadge status={item.status} />
              {item.status === "NOT_REQUESTED" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  disabled={requestOne.isPending}
                  onClick={() => handleRequest(item.clearanceType.id)}
                >
                  Request
                </Button>
              )}
              {item.status === "REJECTED" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  disabled={requestOne.isPending}
                  onClick={() => handleRequest(item.clearanceType.id)}
                >
                  Re-request
                </Button>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
