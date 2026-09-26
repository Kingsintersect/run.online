"use client"

import { useState } from "react"
import { toast } from "sonner"
import { AlertTriangle, Loader2, Lock, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import StatusBadge from "@/components/custom/StatusBadge"
import { cn } from "@/lib/utils"
import { useSubmitRegistration } from "../hooks/use-registration-mutations"
import { registrationErrorMessage } from "../lib/registration-copy"
import { RegistrationCreditMeter } from "./registration-credit-meter"
import type {
  CarryoverCourse,
  LevelCourse,
  RegistrationContext,
} from "../types"

interface RegistrationCourseSelectionProps {
  context: RegistrationContext
  studentId: number | null
}

interface SubmitError {
  offeringId: number
  message: string
}

function prerequisiteNames(course: LevelCourse): string {
  return course.missing_prerequisites
    .map((p) => (typeof p === "string" ? p : p.code))
    .join(", ")
}

// Course selection driven entirely by the RegistrationContext: carryovers
// first (pre-selected; locked when the backend says so), then this level's
// courses. Courses the backend marks as having unmet prerequisites are
// disabled with the missing ones named. Nothing here decides eligibility —
// the backend does, and its rejection codes are mapped to friendly messages.
export function RegistrationCourseSelection({
  context,
  studentId,
}: RegistrationCourseSelectionProps) {
  const submit = useSubmitRegistration()
  const registered = new Set(context.registered_offering_ids)

  const [selected, setSelected] = useState<Set<number>>(() => {
    const initial = new Set<number>()
    for (const c of context.carryover_courses)
      if (c.offering_id !== null) initial.add(c.offering_id)
    return initial
  })
  const [errors, setErrors] = useState<SubmitError[]>([])

  const isLocked = (c: CarryoverCourse) =>
    c.locked || (c.offering_id !== null && registered.has(c.offering_id))
  const isChosen = (offeringId: number | null) =>
    offeringId !== null &&
    (registered.has(offeringId) || selected.has(offeringId))

  const toggle = (offeringId: number) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(offeringId)) next.delete(offeringId)
      else next.add(offeringId)
      return next
    })

  const carryoverUnits = context.carryover_courses
    .filter((c) => isLocked(c) || isChosen(c.offering_id))
    .reduce((sum, c) => sum + c.course.credit_units, 0)
  const levelUnits = context.level_courses
    .filter((c) => isChosen(c.offering_id))
    .reduce((sum, c) => sum + c.course.credit_units, 0)
  const units = carryoverUnits + levelUnits

  const missingOffering = context.carryover_courses.some(
    (c) => c.offering_missing
  )
  const toSubmit = [
    ...context.carryover_courses
      .filter((c) => isLocked(c) || isChosen(c.offering_id))
      .map((c) => c.offering_id),
    ...context.level_courses
      .filter((c) => selected.has(c.offering_id))
      .map((c) => c.offering_id),
  ].filter((id): id is number => id !== null && !registered.has(id))

  const blockedReason = !context.semester.is_open
    ? "Registration isn't open for this semester."
    : !context.gate.can_register
      ? "Clear the issue above before registering."
      : missingOffering
        ? "One of your carryover courses isn't offered this semester — contact your department before registering."
        : studentId === null
          ? "Your student record couldn't be resolved yet."
          : toSubmit.length === 0
            ? "Select at least one course to register."
            : null

  const codeByOffering = new Map<number, string>()
  for (const c of context.carryover_courses)
    if (c.offering_id !== null) codeByOffering.set(c.offering_id, c.course.code)
  for (const c of context.level_courses)
    codeByOffering.set(c.offering_id, c.course.code)

  const handleSubmit = async () => {
    if (blockedReason || studentId === null) return
    setErrors([])
    try {
      const result = await submit.mutateAsync({
        studentId,
        semesterId: context.semester.id,
        offeringIds: toSubmit,
      })
      if (result.enrolled.length) {
        toast.success(
          `Registered ${result.enrolled.length} course${
            result.enrolled.length === 1 ? "" : "s"
          }.`
        )
        setSelected((prev) => {
          const next = new Set(prev)
          for (const r of result.enrolled) next.delete(r.offeringId)
          return next
        })
      }
      const mapped = result.errors.map((e) => ({
        offeringId: e.offeringId,
        message: registrationErrorMessage(e.code, e.message),
      }))
      setErrors(mapped)
      if (mapped.length)
        toast.error(
          `${mapped.length} course${mapped.length === 1 ? "" : "s"} couldn't be registered — see the details below.`
        )
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Registration couldn't be submitted."
      )
    }
  }

  return (
    <section
      aria-labelledby="registration-courses-title"
      className="space-y-5 rounded-3xl border border-border bg-card p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2
            id="registration-courses-title"
            className="text-sm font-bold text-foreground"
          >
            Choose your courses
          </h2>
          <p className="text-xs text-muted-foreground">
            {context.semester.name}
          </p>
        </div>
      </div>

      <RegistrationCreditMeter
        units={units}
        min={context.limits.min_units}
        max={context.limits.max_units}
      />

      {context.carryover_courses.length > 0 && (
        <fieldset className="space-y-2">
          <legend className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Carryover courses
          </legend>
          {context.carryover_courses.map((c) => {
            const locked = isLocked(c)
            const checked = locked || isChosen(c.offering_id)
            const id = `carryover-${c.course.id}`
            return (
              <div
                key={c.course.id}
                className={cn(
                  "flex gap-3 rounded-2xl border p-3",
                  c.offering_missing
                    ? "border-red-500/40 bg-red-500/5 dark:bg-red-500/10"
                    : "border-violet-500/30 bg-violet-500/5 dark:bg-violet-500/10"
                )}
              >
                <Checkbox
                  id={id}
                  checked={checked && !c.offering_missing}
                  disabled={locked || c.offering_missing}
                  onCheckedChange={() =>
                    c.offering_id !== null && toggle(c.offering_id)
                  }
                  className="mt-0.5"
                  aria-describedby={`${id}-meta`}
                />
                <div className="min-w-0 flex-1">
                  <label
                    htmlFor={id}
                    className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground"
                  >
                    <span className="font-mono text-xs text-primary">
                      {c.course.code}
                    </span>
                    {c.course.title}
                    {locked && (
                      <Lock
                        size={12}
                        className="text-muted-foreground"
                        aria-label="Locked"
                      />
                    )}
                  </label>
                  <p
                    id={`${id}-meta`}
                    className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground"
                  >
                    <StatusBadge
                      label={
                        c.last_attempt_session
                          ? `Carryover · ${c.last_attempt_session}`
                          : "Carryover"
                      }
                      variant="purple"
                    />
                    {c.reason === "FAILED"
                      ? "Retake of a course not yet passed"
                      : "Required course from an earlier level"}
                    <span>· {c.course.credit_units} units</span>
                  </p>
                  {c.offering_missing && (
                    <p className="mt-2 flex gap-1.5 text-xs text-red-700 dark:text-red-400">
                      <Phone
                        size={13}
                        className="mt-0.5 shrink-0"
                        aria-hidden
                      />
                      This course isn&apos;t being offered this semester. Please
                      contact your department before registering.
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </fieldset>
      )}

      <fieldset className="space-y-2">
        <legend className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          This level&apos;s courses
        </legend>
        {context.level_courses.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-4 text-xs text-muted-foreground">
            No courses are listed for your level this semester yet.
          </p>
        ) : (
          context.level_courses.map((c) => {
            const already = registered.has(c.offering_id)
            const blocked = !already && !c.prerequisites_met
            const id = `level-${c.offering_id}`
            return (
              <div
                key={c.offering_id}
                className={cn(
                  "flex gap-3 rounded-2xl border border-border p-3 transition-colors",
                  blocked
                    ? "bg-muted/40 opacity-75"
                    : isChosen(c.offering_id)
                      ? "border-primary/50 bg-primary/5"
                      : "hover:border-primary/40"
                )}
              >
                <Checkbox
                  id={id}
                  checked={isChosen(c.offering_id)}
                  disabled={already || blocked}
                  onCheckedChange={() => toggle(c.offering_id)}
                  className="mt-0.5"
                  aria-describedby={`${id}-meta`}
                />
                <div className="min-w-0 flex-1">
                  <label
                    htmlFor={id}
                    className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground"
                  >
                    <span className="font-mono text-xs text-primary">
                      {c.course.code}
                    </span>
                    {c.course.title}
                  </label>
                  <p
                    id={`${id}-meta`}
                    className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground"
                  >
                    <StatusBadge
                      label={c.is_required ? "Required" : "Elective"}
                      variant={c.is_required ? "info" : "default"}
                    />
                    {already && (
                      <StatusBadge label="Registered" variant="success" dot />
                    )}
                    <span>{c.course.credit_units} units</span>
                    {blocked && (
                      <span className="text-amber-700 dark:text-amber-400">
                        Needs {prerequisiteNames(c) || "a prerequisite"} first
                      </span>
                    )}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </fieldset>

      {errors.length > 0 && (
        <div
          role="alert"
          className="space-y-1.5 rounded-2xl border border-red-500/30 bg-red-500/5 p-3 dark:bg-red-500/10"
        >
          {errors.map((e) => (
            <p
              key={e.offeringId}
              className="flex gap-2 text-xs text-red-700 dark:text-red-400"
            >
              <AlertTriangle
                size={13}
                className="mt-0.5 shrink-0"
                aria-hidden
              />
              <span>
                <span className="font-mono font-semibold">
                  {codeByOffering.get(e.offeringId) ?? "Course"}
                </span>
                : {e.message}
              </span>
            </p>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {blockedReason ??
            `${toSubmit.length} course${toSubmit.length === 1 ? "" : "s"} ready to register.`}
        </p>
        <Button
          onClick={() => void handleSubmit()}
          disabled={blockedReason !== null || submit.isPending}
          className="gap-1.5"
        >
          {submit.isPending && (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          )}
          Submit registration
        </Button>
      </div>
    </section>
  )
}
