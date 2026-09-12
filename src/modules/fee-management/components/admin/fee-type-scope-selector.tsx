"use client"

import { useEffect } from "react"
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
import { useLevels } from "@/hooks/useCourseStructure"
import { courseStructureQueryOptions } from "@/services/courseStructureApi"
import { useEligibleCount } from "../../hooks/use-fee-types"
import type { CreateFeeTypeInputValues, FeeCategory } from "../../types"

// Categories that require a session and support cohort scoping
const COHORT_CATEGORIES: FeeCategory[] = ["TUITION", "HOSTEL", "CLEARANCE"]
// Categories billed per-applicant on an event — scope fields hidden entirely
const APPLICANT_CATEGORIES: FeeCategory[] = ["APPLICATION", "ACCEPTANCE"]

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
  const programId = useWatch({ control, name: "programId" })
  const levelId = useWatch({ control, name: "levelId" })
  const studentType = useWatch({ control, name: "studentType" })

  const isCohortCategory = !!category && COHORT_CATEGORIES.includes(category)
  const isApplicantCategory =
    !!category && APPLICANT_CATEGORIES.includes(category)
  const showScopeFields = !!category && !isApplicantCategory
  const sessionRequired = isCohortCategory

  // Clear scope fields when switching to an applicant-only category
  useEffect(() => {
    if (isApplicantCategory) {
      setValue("sessionId", undefined)
      setValue("programId", undefined)
      setValue("levelId", undefined)
    }
  }, [isApplicantCategory, setValue])

  const { data: sessions, isLoading: loadingSessions } = useAcademicSessions()
  const { data: programsData, isLoading: loadingPrograms } = useQuery(
    courseStructureQueryOptions.programs.list()
  )
  const { data: levelsData, isLoading: loadingLevels } = useLevels()

  const programs = programsData?.data ?? []
  const levels = levelsData?.data ?? []

  // Eligible count preview — only fires when scope fields are configured
  const countFilters =
    showScopeFields && category
      ? {
          category,
          sessionId: sessionId ?? undefined,
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
        {isApplicantCategory && (
          <p className="text-xs text-muted-foreground">
            {category === "APPLICATION" ? "Application" : "Acceptance"} fees are
            billed per-applicant on an event — no session or cohort scope
            applies.
          </p>
        )}
        {errors.category && (
          <p className="text-xs text-destructive">{errors.category.message}</p>
        )}
      </div>

      {/* ── Scope fields — hidden entirely for APPLICATION / ACCEPTANCE ── */}
      {showScopeFields && (
        <div className="space-y-5 rounded-xl border border-dashed border-border bg-muted/30 p-4">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Eligibility Scope
          </p>

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
                    {sessions?.map((s) => (
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
