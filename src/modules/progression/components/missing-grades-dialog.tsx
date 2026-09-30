"use client"

import Link from "next/link"
import { Loader2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { readinessIssueLink } from "../lib/readiness-links"
import type { ReadinessIssue } from "../types"

interface MissingGradesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The GRADES_MISSING blocker from the readiness check. */
  issue: ReadinessIssue
  base: string
  targetLabel: string
  onCarryOver: () => void
  pending: boolean
}

function countOf(issue: ReadinessIssue, key: string): number | null {
  const v = issue.context?.[key]
  return Array.isArray(v) ? v.length : null
}

// Asked when missing grades are the only thing stopping a promotion run:
// either carry the ungraded courses over for those students and start the
// run now, or wait until their grades are entered.
export function MissingGradesDialog({
  open,
  onOpenChange,
  issue,
  base,
  targetLabel,
  onCarryOver,
  pending,
}: MissingGradesDialogProps) {
  // B26: context carries studentIds/offeringIds (snake-cased at the
  // service boundary).
  const courses = countOf(issue, "offering_ids")
  const students = countOf(issue, "student_ids") ?? issue.count ?? null
  const affected = [
    students != null ? `${students} student${students === 1 ? "" : "s"}` : null,
    courses != null ? `${courses} course${courses === 1 ? "" : "s"}` : null,
  ].filter(Boolean)
  const link = readinessIssueLink(issue, base)
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!pending) onOpenChange(next)
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Some students have no grades</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                {issue.message}
                {affected.length > 0
                  ? ` (${affected.join(", ")} affected)`
                  : ""}
              </p>
              <p>What should happen to those courses?</p>
              <ul className="list-disc space-y-1 pl-4">
                <li>
                  <span className="font-medium text-foreground">
                    Carry them over
                  </span>{" "}
                  — the run starts now. Each ungraded course is counted as a
                  carryover (&ldquo;No grade entered&rdquo;) for that student
                  instead of withholding their whole result: it adds to their
                  outstanding units in {targetLabel} but not to their GPA. Every
                  other readiness check still applies, and you review the
                  preview before anything is committed.
                </li>
                <li>
                  <span className="font-medium text-foreground">
                    Wait for grades
                  </span>{" "}
                  — nothing starts. Enter and approve the missing grades, then
                  come back and start the run.
                </li>
              </ul>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button variant="outline" asChild disabled={pending}>
            <Link
              href={link?.href ?? `${base}/grades/results`}
              onClick={() => onOpenChange(false)}
            >
              Wait for grades
            </Link>
          </Button>
          <Button onClick={onCarryOver} disabled={pending}>
            {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
            Carry over and start run
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
