"use client"

import { useMemo } from "react"
import { useFormContext, useWatch, Controller } from "react-hook-form"
import { useQuery } from "@tanstack/react-query"
import { Loader2, Users } from "lucide-react"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAcademicSessions } from "@/hooks/useAcademicSessions"
import { useLevels, useMajorPrograms } from "@/hooks/useCourseStructure"
import { courseStructureQueryOptions } from "@/services/courseStructureApi"
import { useEligibleCount } from "../../hooks/use-fee-types"
import type { CreateFeeTypeInputValues, FeeCategory } from "../../types"

// Categories `CreateFeeTypeDtoSchema` actually requires a session for
// (the only category-dependent rule the real schema enforces). Every other
// category — Application, Acceptance, and Other included — can still take a
// session, major program, program, or level; it's just optional for them,
// not forced. A different fee amount per major program (e.g. a Certificate
// application fee vs. an Undergraduate one) is a completely normal case, so
// Eligibility Scope applies to every category, not a subset of them.
const COHORT_CATEGORIES: FeeCategory[] = ["TUITION", "HOSTEL", "CLEARANCE"]
// Every field here stays a real, live choice for every category — the
// super admin decides the scope, not the frontend. The backend currently
// 422s a majorProgramId/programId on APPLICATION/ACCEPTANCE (bruno/fee/
// Fee Types - Create.bru, confirmed 2026-09-15) and this has been flagged
// to backend as a policy-change request (BACKEND_DEVIATIONS Part E1) — but
// that's a live backend constraint to surface honestly if it's hit, not a
// reason to pre-emptively disable the choice here.
const MAJOR_PROGRAM_ADVISORY_CATEGORIES: FeeCategory[] = [
  "APPLICATION",
  "ACCEPTANCE",
]

// Sentinel value for "no selection" in optional selects
const NONE = "_NONE_" as const

export function FeeTypeScopeSelector() {
  const {
    control,
    setValue,
    formState: { errors },
  } = useFormContext<CreateFeeTypeInputValues>()

  const category = useWatch({ control, name: "category" }) as
    | FeeCategory
    | undefined
  const sessionId = useWatch({ control, name: "sessionId" })
  const majorProgramId = useWatch({ control, name: "majorProgramId" })
  const programId = useWatch({ control, name: "programId" })
  const levelId = useWatch({ control, name: "levelId" })
  const studentType = useWatch({ control, name: "studentType" })

  const isCohortCategory = !!category && COHORT_CATEGORIES.includes(category)
  const showScopeFields = !!category
  const sessionRequired = isCohortCategory
  const showMajorProgramAdvisory =
    !!category &&
    MAJOR_PROGRAM_ADVISORY_CATEGORIES.includes(category) &&
    (majorProgramId != null || programId != null)

  const { data: sessions, isLoading: loadingSessions } = useAcademicSessions()
  const { data: programsData, isLoading: loadingPrograms } = useQuery(
    courseStructureQueryOptions.programs.list()
  )
  const { data: levelsData, isLoading: loadingLevels } = useLevels()
  const { data: majorProgramsRes } = useMajorPrograms()

  const allPrograms = programsData?.data ?? []
  const levels = levelsData?.data ?? []
  const majorPrograms = useMemo(
    () => (majorProgramsRes?.data ?? []).filter((mp) => mp.isActive),
    [majorProgramsRes]
  )
  const hasMultipleMajorPrograms = majorPrograms.length > 1

  // Major Program — sandbox/major-program-scoping/SCHEMA_CHANGES.md §2a
  // (new capability, not yet built on the backend — BACKEND_DEVIATIONS
  // A12). This is a real form field, sent as `majorProgramId`: choosing one
  // scopes the fee to every program under it (when Program below is left
  // blank), not just narrows these pickers cosmetically. Also filters the
  // Session/Program pickers to that major program's own rows, same as the
  // scope tabs already built for Academic Sessions and Admissions
  // Management. Until A12 ships, the backend has no `majorProgramId` column
  // to act on — see the warning rendered below the field.
  const programs = majorProgramId
    ? allPrograms.filter((p) => p.majorProgramId === majorProgramId)
    : allPrograms
  const scopedSessions = majorProgramId
    ? (sessions ?? []).filter((s) => s.majorProgramId === majorProgramId)
    : (sessions ?? [])

  // Changing the major program clears an already-selected session or
  // program that's no longer in the narrowed list, rather than leaving a
  // selection hidden from its own dropdown.
  const handleMajorProgramIdChange = (id: number | null) => {
    setValue("majorProgramId", id ?? undefined)
    if (
      programId &&
      !allPrograms.some(
        (p) => p.id === programId && (!id || p.majorProgramId === id)
      )
    ) {
      setValue("programId", undefined)
    }
    if (
      sessionId &&
      !(sessions ?? []).some(
        (s) => s.id === sessionId && (!id || s.majorProgramId === id)
      )
    ) {
      setValue("sessionId", undefined)
    }
  }

  // Eligible count preview — only fires when scope fields are configured
  const countFilters =
    showScopeFields && category
      ? {
          category,
          sessionId: sessionId ?? undefined,
          majorProgramId: majorProgramId ?? undefined,
          programId: programId ?? undefined,
          levelId: levelId ?? undefined,
          studentType: studentType ?? undefined,
        }
      : null
  const { data: countData, isLoading: loadingCount } =
    useEligibleCount(countFilters)

  const selectClass =
    "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs " +
    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none " +
    "aria-invalid:border-destructive"

  return (
    <div className="space-y-5">
      {/* ── Category ────────────────────────────────────────────────── */}
      <div className="space-y-1.5">
        <Label htmlFor="fee-category">
          Fee Category <span className="text-destructive">*</span>
        </Label>
        <Controller
          control={control}
          name="category"
          render={({ field }) => (
            <Select value={field.value ?? ""} onValueChange={field.onChange}>
              <SelectTrigger
                id="fee-category"
                aria-invalid={!!errors.category}
                className={selectClass}
              >
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="APPLICATION">Application</SelectItem>
                <SelectItem value="ACCEPTANCE">Acceptance</SelectItem>
                <SelectItem value="TUITION">Tuition</SelectItem>
                <SelectItem value="HOSTEL">Hostel</SelectItem>
                <SelectItem value="CLEARANCE">Clearance</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
        {errors.category && (
          <p className="text-xs text-destructive">{errors.category.message}</p>
        )}
      </div>

      {/* ── Scope fields — apply to every category ──────────────────── */}
      {showScopeFields && (
        <div className="space-y-5 rounded-xl border border-dashed border-border bg-muted/30 p-4">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Eligibility Scope
          </p>

          {/* Major Program */}
          {hasMultipleMajorPrograms && (
            <div className="space-y-1.5">
              <Label htmlFor="fee-major-program">
                Major Program
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  (optional — blank = every major program)
                </span>
              </Label>
              <Select
                value={majorProgramId?.toString() ?? NONE}
                onValueChange={(v) =>
                  handleMajorProgramIdChange(v === NONE ? null : Number(v))
                }
              >
                <SelectTrigger id="fee-major-program" className={selectClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>
                    <span className="text-muted-foreground italic">
                      Every major program
                    </span>
                  </SelectItem>
                  {majorPrograms.map((mp) => (
                    <SelectItem key={mp.id} value={mp.id.toString()}>
                      {mp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {showMajorProgramAdvisory && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Heads up: the backend currently rejects a Major Program or
                  Program on{" "}
                  {category === "APPLICATION" ? "Application" : "Acceptance"}{" "}
                  fees (confirmed 2026-09-15) — this has been raised with the
                  backend team to change. Try saving; if it 422s, that request
                  hasn&apos;t shipped yet.
                </p>
              )}
            </div>
          )}

          {/* Session */}
          <div className="space-y-1.5">
            <Label htmlFor="fee-session">
              Academic Session
              {sessionRequired && (
                <span className="ml-1 text-destructive">*</span>
              )}
              {!sessionRequired && (
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  (optional)
                </span>
              )}
            </Label>
            <Controller
              control={control}
              name="sessionId"
              render={({ field }) => (
                <Select
                  value={field.value?.toString() ?? NONE}
                  onValueChange={(v) =>
                    field.onChange(v === NONE ? undefined : Number(v))
                  }
                >
                  <SelectTrigger
                    id="fee-session"
                    aria-invalid={!!errors.sessionId}
                    className={selectClass}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>
                      <span className="text-muted-foreground italic">
                        {loadingSessions
                          ? "Loading sessions…"
                          : "— No session —"}
                      </span>
                    </SelectItem>
                    {scopedSessions.map((s) => (
                      <SelectItem key={s.id} value={s.id.toString()}>
                        {s.name}
                        {s.isActive && (
                          <span className="ml-1.5 text-xs text-green-600 dark:text-green-400">
                            (Active)
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.sessionId && (
              <p className="text-xs text-destructive">
                {errors.sessionId.message}
              </p>
            )}
          </div>

          {/* Program */}
          <div className="space-y-1.5">
            <Label htmlFor="fee-program">
              Program
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                (optional — blank = all programs)
              </span>
            </Label>
            <Controller
              control={control}
              name="programId"
              render={({ field }) => (
                <Select
                  value={field.value?.toString() ?? NONE}
                  onValueChange={(v) =>
                    field.onChange(v === NONE ? undefined : Number(v))
                  }
                >
                  <SelectTrigger id="fee-program" className={selectClass}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>
                      <span className="text-muted-foreground italic">
                        {loadingPrograms ? "Loading programs…" : "All programs"}
                      </span>
                    </SelectItem>
                    {programs.map((p) => (
                      <SelectItem key={p.id} value={p.id.toString()}>
                        {p.name}
                        {p.code && (
                          <span className="ml-1.5 text-xs text-muted-foreground">
                            ({p.code})
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Level — university-wide; not nested under program */}
          <div className="space-y-1.5">
            <Label htmlFor="fee-level">
              Level
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                (optional — blank = all levels)
              </span>
            </Label>
            <Controller
              control={control}
              name="levelId"
              render={({ field }) => (
                <Select
                  value={field.value?.toString() ?? NONE}
                  onValueChange={(v) =>
                    field.onChange(v === NONE ? undefined : Number(v))
                  }
                >
                  <SelectTrigger id="fee-level" className={selectClass}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>
                      <span className="text-muted-foreground italic">
                        {loadingLevels ? "Loading levels…" : "All levels"}
                      </span>
                    </SelectItem>
                    {levels
                      .slice()
                      .sort((a, b) => a.numericValue - b.numericValue)
                      .map((l) => (
                        <SelectItem key={l.id} value={l.id.toString()}>
                          {l.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Student Type — segmented button group */}
          <div className="space-y-1.5">
            <Label>Student Type</Label>
            <Controller
              control={control}
              name="studentType"
              render={({ field }) => (
                <div className="flex gap-2">
                  {(["ALL", "NEW", "RETURNING"] as const).map((type) => {
                    const label =
                      type === "ALL"
                        ? "All"
                        : type === "NEW"
                          ? "New"
                          : "Returning"
                    const active = (field.value ?? "ALL") === type
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => field.onChange(type)}
                        className={
                          active
                            ? "rounded-lg border border-primary bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary"
                            : "rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted"
                        }
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              )}
            />
          </div>

          {/* Eligible student count preview */}
          <div className="flex items-center gap-2 border-t border-border/50 pt-1 text-sm text-muted-foreground">
            <Users size={13} />
            {loadingCount ? (
              <span className="flex items-center gap-1.5 text-xs">
                <Loader2 size={11} className="animate-spin" />
                Checking eligible students…
              </span>
            ) : countData ? (
              <span className="text-xs">
                ≈{" "}
                <strong className="text-foreground">
                  {countData.count.toLocaleString("en-NG")}
                </strong>{" "}
                eligible student{countData.count !== 1 ? "s" : ""} match this
                scope
              </span>
            ) : (
              <span className="text-xs italic">
                Student count preview available once the scope is configured
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
