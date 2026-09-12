"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import Modal from "@/components/custom/Modal"
import { Button } from "@/components/ui/button"
import { useDropEnrollment } from "../hooks/use-enrollment-mutations"
import type { EnrollmentRecord } from "../types"

interface DropEnrollmentDialogProps {
  enrollment: EnrollmentRecord | null
  onClose: () => void
}

export function DropEnrollmentDialog({
  enrollment,
  onClose,
}: DropEnrollmentDialogProps) {
  const [reason, setReason] = useState("")
  const dropMutation = useDropEnrollment()

  const handleDrop = async () => {
    if (!enrollment) return
    await dropMutation.mutateAsync({
      id: enrollment.id,
      dto: reason.trim() ? { reason: reason.trim() } : {},
    })
    setReason("")
    onClose()
  }

  return (
    <Modal
      open={!!enrollment}
      onClose={onClose}
      title="Drop Enrollment"
      subtitle={
        enrollment
          ? `${enrollment.studentName} — ${enrollment.courseCode}`
          : undefined
      }
    >
      <div className="space-y-4 p-5">
        <p className="text-xs text-muted-foreground">
          Dropping within the registration window is penalty-free; after the
          window closes the backend records this as a withdrawal instead, which
          may appear on the transcript.
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          maxLength={255}
          placeholder="Reason (optional)…"
          className="w-full resize-none rounded-xl border border-border bg-background p-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
        />
        {dropMutation.isError && (
          <p className="text-xs text-destructive">
            {dropMutation.error?.message ?? "Failed to drop enrollment."}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={dropMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => void handleDrop()}
            disabled={dropMutation.isPending}
            className="min-w-24 gap-2"
          >
            {dropMutation.isPending && (
              <Loader2 size={13} className="animate-spin" />
            )}
            Drop
          </Button>
        </div>
      </div>
    </Modal>
  )
}
