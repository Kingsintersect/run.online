"use client"

import { useState } from "react"
import { toast } from "sonner"
import { GraduationCap, Loader2, UserCheck } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"
import { useAppStore } from "@/store"
import { UserRole } from "@/config/nav.config"
import { usePromoteApplicantToStudent } from "../hooks/use-promote-applicant-to-student"
import { useApplicantPromotionUiStore } from "../store/applicant-promotion-ui.store"
import { PROMOTION_UNAVAILABLE_MESSAGE, toPromotionError } from "../lib/errors"

interface PromoteToStudentActionProps {
  /** The applicant's USER id (the application's `applicant_id`). */
  applicantUserId: number
  applicantName: string
  className?: string
}

/**
 * Manual override: promote an applicant whose admission offer was ACCEPTED
 * into an active Student. Normally the backend does this itself once tuition
 * is verified; this is for an applicant whose automatic promotion didn't
 * happen. The caller decides *when* it's relevant (accepted offer, not yet a
 * student); this component decides *who* may see it.
 */
export function PromoteToStudentAction({
  applicantUserId,
  applicantName,
  className,
}: PromoteToStudentActionProps) {
  // The promote endpoint is gated on the literal `admin` role
  // (StudentController::promote() → requireRoles(['admin'])), not a
  // permission, so there is no permission to check with <PermissionGate> —
  // same precedent as src/modules/user-management/components/Summary.tsx.
  // DEAN/STAFF share the manager layout but would always 403 here.
  // SUPER_ADMIN keeps total control per CLAUDE.md; whether the backend's
  // admin gate admits super_admin on THIS route isn't documented, so a 403
  // is surfaced honestly as "not permitted" rather than assumed away.
  const { user } = useAppStore()
  const isAdmin =
    user?.role === UserRole.ADMIN || user?.role === UserRole.SUPER_ADMIN

  const endpointMissing = useApplicantPromotionUiStore((s) => s.endpointMissing)
  const promote = usePromoteApplicantToStudent(applicantUserId)
  const [open, setOpen] = useState(false)
  const [promotedMatric, setPromotedMatric] = useState<string | null>(null)
  const [promoted, setPromoted] = useState(false)

  if (!isAdmin || !Number.isInteger(applicantUserId) || applicantUserId <= 0)
    return null

  const error = promote.error ? toPromotionError(promote.error) : null

  function change(next: boolean) {
    if (promote.isPending) return
    if (!next) promote.reset()
    setOpen(next)
  }

  function handleConfirm() {
    promote.mutate(undefined, {
      onSuccess: ({ student }) => {
        const matric = student?.matricNumber ?? null
        setPromoted(true)
        setPromotedMatric(matric)
        toast.success(
          matric
            ? `${applicantName} is now a student — matric number ${matric}.`
            : `${applicantName} is now a student.`
        )
        setOpen(false)
      },
      onError: (err) => {
        const mapped = toPromotionError(err)
        if (mapped.kind === "not-available") {
          toast.info(PROMOTION_UNAVAILABLE_MESSAGE)
          promote.reset()
          setOpen(false)
        }
        // Every other failure stays inline in the open dialog.
      },
    })
  }

  if (promoted) {
    return (
      <span
        role="status"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-xl bg-emerald-600/15 px-4 py-2 text-sm font-medium text-emerald-700 dark:text-emerald-400",
          className
        )}
      >
        <UserCheck size={16} aria-hidden />
        {promotedMatric ? `Student · ${promotedMatric}` : "Promoted to student"}
      </span>
    )
  }

  if (endpointMissing) {
    return (
      <button
        type="button"
        disabled
        aria-disabled
        title={PROMOTION_UNAVAILABLE_MESSAGE}
        aria-label={`Promote to student — ${PROMOTION_UNAVAILABLE_MESSAGE}`}
        className={cn(
          "inline-flex cursor-not-allowed items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted-foreground opacity-60 dark:border-border",
          className
        )}
      >
        <GraduationCap size={16} aria-hidden />
        Promote to student (unavailable)
      </button>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-xl border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/15 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none dark:border-primary/50 dark:bg-primary/15 dark:hover:bg-primary/25",
          className
        )}
      >
        <GraduationCap size={16} aria-hidden />
        Promote to student
      </button>

      <AlertDialog open={open} onOpenChange={change}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Promote {applicantName} to student?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  This turns the applicant into an{" "}
                  <strong>active student</strong> on their accepted admission: a
                  student record is created and they move from the applicant
                  portal to the student portal.
                </p>
                <p>
                  This normally happens automatically once their tuition payment
                  is verified. Use it only when the admission was accepted but
                  the automatic promotion didn&apos;t happen.
                </p>
                <p className="font-medium text-amber-700 dark:text-amber-400">
                  This can&apos;t be undone from the portal.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          {error && error.kind !== "not-available" && (
            <p
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive dark:border-destructive/40 dark:bg-destructive/15"
            >
              {error.message}
            </p>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={promote.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={promote.isPending}
              aria-busy={promote.isPending}
              onClick={(e) => {
                e.preventDefault()
                handleConfirm()
              }}
            >
              {promote.isPending && (
                <Loader2 className="animate-spin" data-icon="inline-start" />
              )}
              {promote.isPending ? "Promoting…" : "Promote to student"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
