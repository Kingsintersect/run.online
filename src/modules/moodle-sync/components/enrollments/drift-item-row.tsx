"use client"

import { toast } from "sonner"
import {
  Loader2,
  RotateCcw,
  UploadCloud,
  UserMinus,
  XCircle,
} from "lucide-react"
import StatusBadge from "@/components/custom/StatusBadge"
import { Button } from "@/components/ui/button"
import { PermissionGate } from "@/lib/permissions/PermissionGate"
import {
  useReEnrollDrift,
  useReopenDrift,
} from "../../hooks/use-sync-mutations"
import type {
  EnrollmentDriftItem,
  EnrollmentDriftKind,
  EnrollmentDriftResolution,
} from "../../types"

// Enrollment drift — sandbox/moodle-sync-reconciliation/ENROLLMENT_DRIFT.md.

const KIND_META: Record<
  EnrollmentDriftKind,
  { label: string; variant: "warning" | "destructive"; explanation: string }
> = {
  MISSING_IN_MOODLE: {
    label: "Missing in Moodle",
    variant: "warning",
    explanation:
      "Enrolled on the portal but not in Moodle — the student can't open this course.",
  },
  ONLY_IN_MOODLE: {
    label: "Only in Moodle",
    variant: "destructive",
    explanation: "Enrolled in Moodle with no portal enrollment or fee record.",
  },
}

const RESOLUTION_LABEL: Record<EnrollmentDriftResolution, string> = {
  RE_ENROLLED: "Re-enrolled in Moodle",
  UNENROLLED_IN_MOODLE: "Removed from Moodle",
  DISMISSED: "Dismissed",
  AUTO_CLEARED: "Back in sync",
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

interface DriftItemRowProps {
  item: EnrollmentDriftItem
  showCourse?: boolean
  onDismiss: (item: EnrollmentDriftItem) => void
  onUnenrol: (item: EnrollmentDriftItem) => void
  /** Called with the updated item after an action here succeeds. */
  onResolved?: (item: EnrollmentDriftItem) => void
}

export function DriftItemRow({
  item,
  showCourse = false,
  onDismiss,
  onUnenrol,
  onResolved,
}: DriftItemRowProps) {
  const reEnroll = useReEnrollDrift()
  const reopen = useReopenDrift()
  const meta = KIND_META[item.kind]
  const identity = [item.matricNumber, item.email].filter(Boolean).join(" · ")

  const handleReEnroll = async () => {
    try {
      const updated = await reEnroll.mutateAsync(item.id)
      toast.success(
        `${item.studentName} re-enrolled in ${item.courseCode} on Moodle`
      )
      onResolved?.(updated)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Couldn't re-enroll in Moodle"
      )
    }
  }

  const handleReopen = async () => {
    try {
      const updated = await reopen.mutateAsync(item.id)
      toast.success("Reopened for review")
      onResolved?.(updated)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't reopen")
    }
  }

  return (
    <li className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge label={meta.label} variant={meta.variant} dot />
          {item.status === "DISMISSED" && (
            <StatusBadge label="Dismissed" variant="default" />
          )}
          {item.status === "RESOLVED" && item.resolution && (
            <StatusBadge
              label={RESOLUTION_LABEL[item.resolution]}
              variant="success"
            />
          )}
        </div>
        <p className="text-sm font-medium text-foreground">
          {item.studentName}
        </p>
        {identity && (
          <p className="text-xs text-muted-foreground">{identity}</p>
        )}
        {showCourse && (
          <p className="text-xs text-muted-foreground">
            {item.courseCode} — {item.courseTitle}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          {item.status === "OPEN"
            ? meta.explanation
            : `Detected ${formatDate(item.detectedAt)}`}
        </p>
        {item.resolutionNote && (
          <p className="text-xs text-muted-foreground italic">
            &ldquo;{item.resolutionNote}&rdquo;
          </p>
        )}
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {item.status === "OPEN" && item.kind === "MISSING_IN_MOODLE" && (
          <PermissionGate require={{ resource: "moodle-sync", action: "push" }}>
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 text-xs"
              onClick={handleReEnroll}
              disabled={reEnroll.isPending}
            >
              {reEnroll.isPending ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <UploadCloud size={12} />
              )}
              Re-enroll in Moodle
            </Button>
          </PermissionGate>
        )}

        {item.status === "OPEN" && item.kind === "ONLY_IN_MOODLE" && (
          <PermissionGate
            require={{ resource: "moodle-sync", action: "drift.resolve" }}
          >
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 text-xs text-destructive hover:text-destructive"
              onClick={() => onUnenrol(item)}
            >
              <UserMinus size={12} />
              Remove from Moodle
            </Button>
          </PermissionGate>
        )}

        {item.status === "OPEN" && (
          <PermissionGate
            require={{ resource: "moodle-sync", action: "drift.resolve" }}
          >
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1 text-xs"
              onClick={() => onDismiss(item)}
            >
              <XCircle size={12} />
              Dismiss
            </Button>
          </PermissionGate>
        )}

        {item.status === "DISMISSED" && (
          <PermissionGate
            require={{ resource: "moodle-sync", action: "drift.resolve" }}
          >
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 text-xs"
              onClick={handleReopen}
              disabled={reopen.isPending}
            >
              {reopen.isPending ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <RotateCcw size={12} />
              )}
              Reopen
            </Button>
          </PermissionGate>
        )}
      </div>
    </li>
  )
}
