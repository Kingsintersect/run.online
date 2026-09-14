"use client"

import { useState } from "react"
import Link from "next/link"
import { CheckCircle2, ListChecks, Loader2 } from "lucide-react"
import Modal from "@/components/custom/Modal"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PermissionGate } from "@/lib/permissions/PermissionGate"
import { useSyncCourses } from "../../hooks/use-sync-courses"
import { useCheckCourseEnrollments } from "../../hooks/use-sync-mutations"
import { DriftItemRow } from "./drift-item-row"
import {
  ResolveDriftDialog,
  type ResolveDriftMode,
} from "./resolve-drift-dialog"
import type { EnrollmentDriftItem } from "../../types"

// Enrollment drift — sandbox/moodle-sync-reconciliation/ENROLLMENT_DRIFT.md.
// One Moodle call per check.

export function CheckCourseEnrollmentsButton() {
  const [open, setOpen] = useState(false)
  const [moodleCourseId, setMoodleCourseId] = useState<number | null>(null)
  // A check result is a one-off snapshot, so actions taken inside this dialog
  // are overlaid locally instead of re-running the Moodle check.
  const [overrides, setOverrides] = useState<
    Record<number, EnrollmentDriftItem>
  >({})
  const [resolveItem, setResolveItem] = useState<EnrollmentDriftItem | null>(
    null
  )
  const [resolveMode, setResolveMode] = useState<ResolveDriftMode>("dismiss")

  const { data: courses = [] } = useSyncCourses()
  const check = useCheckCourseEnrollments()

  const syncedCourses = courses.filter((c) => c.moodleCourseId !== null)
  const result = check.data
  const items = (result?.items ?? []).map((i) => overrides[i.id] ?? i)
  const contextCount = result
    ? result.summary.failedPush + result.summary.pendingPush
    : 0

  const selectCourse = (value: string) => {
    setMoodleCourseId(Number(value))
    setOverrides({})
    check.reset()
  }

  const runCheck = () => {
    if (moodleCourseId === null) return
    setOverrides({})
    check.mutate(moodleCourseId)
  }

  const handleClose = () => {
    setOpen(false)
    setMoodleCourseId(null)
    setOverrides({})
    check.reset()
  }

  const recordResolved = (updated: EnrollmentDriftItem) =>
    setOverrides((prev) => ({ ...prev, [updated.id]: updated }))

  const startResolve = (item: EnrollmentDriftItem, mode: ResolveDriftMode) => {
    setResolveMode(mode)
    setResolveItem(item)
  }

  return (
    <>
      <PermissionGate require={{ resource: "moodle-sync", action: "pull" }}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
          className="h-8 gap-1.5 text-xs"
        >
          <ListChecks size={13} />
          Check a course
        </Button>
      </PermissionGate>

      <Modal
        open={open}
        onClose={handleClose}
        title="Check a course's enrollments"
        subtitle="Compares one course in Moodle with the portal. Nothing changes until you act on a result."
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={handleClose}>
              Close
            </Button>
            <Button
              onClick={runCheck}
              disabled={moodleCourseId === null || check.isPending}
            >
              {check.isPending && (
                <Loader2
                  className="size-4 animate-spin"
                  data-icon="inline-start"
                />
              )}
              Run check
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="drift-check-course">Course</Label>
            {syncedCourses.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No courses are synced to Moodle yet.
              </p>
            ) : (
              <Select
                value={
                  moodleCourseId !== null ? String(moodleCourseId) : undefined
                }
                onValueChange={selectCourse}
              >
                <SelectTrigger id="drift-check-course" className="w-full">
                  <SelectValue placeholder="Select a synced course" />
                </SelectTrigger>
                <SelectContent>
                  {syncedCourses.map((c) => (
                    <SelectItem key={c.id} value={String(c.moodleCourseId)}>
                      {c.courseCode} — {c.courseTitle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {check.isPending ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="size-6 animate-spin text-primary" />
              Comparing this course with Moodle…
            </div>
          ) : check.isError ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {check.error instanceof Error
                ? check.error.message
                : "Couldn't run the check."}
            </div>
          ) : result ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2 text-xs">
                {(
                  [
                    ["In sync", result.summary.inSync],
                    ["Missing in Moodle", result.summary.missingInMoodle],
                    ["Only in Moodle", result.summary.onlyInMoodle],
                  ] as const
                ).map(([label, count]) => (
                  <span
                    key={label}
                    className="rounded-full border border-border bg-muted px-2.5 py-1 text-muted-foreground"
                  >
                    {label}:{" "}
                    <span className="font-semibold text-foreground tabular-nums">
                      {count}
                    </span>
                  </span>
                ))}
              </div>

              {contextCount > 0 && (
                <p className="text-xs text-muted-foreground">
                  {result.summary.failedPush} failed and{" "}
                  {result.summary.pendingPush} pending push(es) aren&apos;t
                  drift — they&apos;re handled by Push All Pending and the{" "}
                  <Link
                    href="/admin/moodle-sync/enrollments/errors"
                    className="text-primary underline-offset-2 hover:underline"
                  >
                    Errors page
                  </Link>
                  .
                </p>
              )}

              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border py-8 text-sm text-muted-foreground">
                  <CheckCircle2 className="size-6 text-emerald-600 dark:text-emerald-400" />
                  No drift — this course matches the portal.
                </div>
              ) : (
                <ul className="max-h-[45vh] divide-y divide-border overflow-y-auto rounded-xl border border-border">
                  {items.map((item) => (
                    <DriftItemRow
                      key={item.id}
                      item={item}
                      onDismiss={(i) => startResolve(i, "dismiss")}
                      onUnenrol={(i) => startResolve(i, "unenrol")}
                      onResolved={recordResolved}
                    />
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </div>
      </Modal>

      <ResolveDriftDialog
        item={resolveItem}
        mode={resolveMode}
        onClose={() => setResolveItem(null)}
        onResolved={recordResolved}
      />
    </>
  )
}
