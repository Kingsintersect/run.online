"use client"

import { useMemo, useState } from "react"
import { Info, Loader2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import Combobox from "@/components/custom/Combobox"
import { useMajorPrograms } from "@/hooks/useCourseStructure"
import { useProgramCoursesByProgram } from "@/hooks/useCourseManagement"
import { useMajorProgramStructure } from "@/hooks/use-major-program-structure"
import {
  formatOfferingCategory,
  formatOfferingMeta,
} from "@/lib/academic/course-offering-enrichment"
import { cn } from "@/lib/utils"
import { useAssignCourse, useCourseOfferings } from "../hooks/useUsersData"
import type { TutorCourseRole } from "@/types/users"

export const TUTOR_ROLE_OPTIONS: { value: TutorCourseRole; label: string }[] = [
  { value: "primary", label: "Primary" },
  { value: "assistant", label: "Assistant" },
  { value: "tutorial", label: "Tutorial" },
]

const selectCls =
  "w-full rounded-xl border border-transparent bg-muted px-3 py-2 text-sm text-foreground outline-none transition-all appearance-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-muted/60"

interface Option {
  value: string
  label: string
}

function Picker({
  id,
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  options: Option[]
  placeholder: string
  disabled?: boolean
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1 block text-xs font-medium text-foreground"
      >
        {label}
      </label>
      <select
        id={id}
        className={selectCls}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}

interface TutorCourseAssignFormProps {
  tutorId: number
  /** Offerings the tutor already teaches, hidden from the picker. */
  assignedOfferingIds: Set<number>
}

// Assign a course to a tutor. A lecturer can teach across major programs
// (B.Sc, postgraduate, business school…), so the tutor's own major program
// no longer limits the list. Instead the course is located the way it is
// organised: Major program → that program's own structure (Faculty,
// Department… only the levels its academic-unit tree has) → Program → Level →
// the offering. Each course belongs to a program, and each program to a major
// program.
//
// Data, all from live endpoints:
// - offerings: GET /courses/offerings?majorProgramId= (filters by the
//   offering's real owners, `majorProgramIds`);
// - structure: the academic-unit tree (useMajorProgramStructure);
// - a program's courses: GET /courses/programs/{id}. Offerings don't carry
//   their programs yet (BACKEND_DEVIATIONS B21), so the chosen program's
//   curriculum is fetched once and matched by course code.
export function TutorCourseAssignForm({
  tutorId,
  assignedOfferingIds,
}: TutorCourseAssignFormProps) {
  const [majorProgramId, setMajorProgramId] = useState<number | null>(null)
  const [unitPath, setUnitPath] = useState<number[]>([])
  const [programId, setProgramId] = useState<number | null>(null)
  const [levelName, setLevelName] = useState("")
  const [selectedOffering, setSelectedOffering] = useState<number>(0)
  const [role, setRole] = useState<TutorCourseRole>("primary")

  const { data: majorProgramsRes, isLoading: loadingMajorPrograms } =
    useMajorPrograms()
  const majorPrograms = useMemo(
    () =>
      (majorProgramsRes?.data ?? [])
        .filter((mp) => mp.isActive)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [majorProgramsRes]
  )
  const majorProgramName = new Map(majorPrograms.map((mp) => [mp.id, mp.name]))

  const structure = useMajorProgramStructure(majorProgramId, unitPath)
  const offeringsQ = useCourseOfferings(
    { majorProgramId },
    { enabled: majorProgramId != null }
  )
  const curriculumQ = useProgramCoursesByProgram(programId)
  const curriculumCodes = useMemo(
    () =>
      programId == null
        ? null
        : new Set((curriculumQ.data?.data ?? []).map((c) => c.code)),
    [programId, curriculumQ.data]
  )

  // In the chosen major program (checked against the offering's own
  // owners too), not yet assigned to this tutor, and in the chosen
  // program's curriculum when a program is picked.
  const inScope = useMemo(
    () =>
      (offeringsQ.data?.data ?? []).filter(
        (o) =>
          !assignedOfferingIds.has(o.id) &&
          (o.major_program_ids.length === 0 ||
            majorProgramId == null ||
            o.major_program_ids.includes(majorProgramId)) &&
          (curriculumCodes == null || curriculumCodes.has(o.course_code))
      ),
    [offeringsQ.data, assignedOfferingIds, majorProgramId, curriculumCodes]
  )
  const levelOptions = useMemo(
    () =>
      Array.from(
        new Set(
          inScope
            .map((o) => o.level_name)
            .filter((v): v is string => Boolean(v))
        )
      )
        .sort()
        .map((l) => ({ value: l, label: l })),
    [inScope]
  )
  const offerings = inScope.filter(
    (o) => !levelName || o.level_name === levelName
  )

  const offeringOptions = offerings.map((o) => {
    const owners = o.major_program_ids
      .map((id) => majorProgramName.get(id))
      .filter(Boolean)
      .join(", ")
    return {
      value: o.id,
      label: `${o.course_code} — ${o.course_title}`,
      description: [
        [formatOfferingMeta(o), o.status].filter(Boolean).join(" · "),
        owners,
        formatOfferingCategory(o),
      ]
        .filter(Boolean)
        .join("  ·  "),
    }
  })

  const assignCourse = useAssignCourse()
  const handleAssign = async () => {
    if (!selectedOffering) return
    await assignCourse.mutateAsync({
      tutor_id: tutorId,
      offering_id: selectedOffering,
      role,
    })
    setSelectedOffering(0)
    setRole("primary")
  }

  // Changing a level clears everything below it.
  const pickMajorProgram = (v: string) => {
    setMajorProgramId(v ? Number(v) : null)
    setUnitPath([])
    setProgramId(null)
    setLevelName("")
    setSelectedOffering(0)
  }
  const pickUnit = (depth: number, v: string) => {
    const path = unitPath.slice(0, depth)
    if (v) path.push(Number(v))
    setUnitPath(path)
    setProgramId(null)
    setLevelName("")
    setSelectedOffering(0)
  }
  const pickProgram = (v: string) => {
    setProgramId(v ? Number(v) : null)
    setLevelName("")
    setSelectedOffering(0)
  }

  const hasMajorProgram = majorProgramId != null
  const loadingList =
    hasMajorProgram &&
    (offeringsQ.isLoading || (programId != null && curriculumQ.isLoading))
  const unitOnly = unitPath.length > 0 && programId == null

  return (
    <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4 dark:bg-muted/10">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Assign course</h3>
        <p className="text-xs text-muted-foreground">
          Tutors can teach in any major program. Find the course through its
          major program and program.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Picker
          id="assign-major-program"
          label="Major program"
          value={majorProgramId ? String(majorProgramId) : ""}
          onChange={pickMajorProgram}
          placeholder={
            loadingMajorPrograms ? "Loading…" : "Choose a major program"
          }
          options={majorPrograms.map((mp) => ({
            value: String(mp.id),
            label: mp.name,
          }))}
        />
        {/* One picker per level this major program's tree actually has. */}
        {structure.levels.map((level) => (
          <Picker
            key={`${majorProgramId}-${level.depth}`}
            id={`assign-unit-${level.depth}`}
            label={level.label}
            value={level.selectedId ? String(level.selectedId) : ""}
            onChange={(v) => pickUnit(level.depth, v)}
            placeholder={`All (${level.options.length})`}
            options={level.options.map((o) => ({
              value: String(o.id),
              label: o.name,
            }))}
          />
        ))}
        <Picker
          id="assign-program"
          label="Program"
          value={programId ? String(programId) : ""}
          onChange={pickProgram}
          disabled={!hasMajorProgram || structure.isLoading}
          placeholder={
            !hasMajorProgram
              ? "Pick a major program first"
              : structure.isLoading
                ? "Loading…"
                : structure.programs.length === 0
                  ? "No programs"
                  : "All programs"
          }
          options={structure.programs.map((p) => ({
            value: String(p.program.id),
            label: p.program.name,
          }))}
        />
        <Picker
          id="assign-level"
          label="Level"
          value={levelName}
          onChange={(v) => {
            setLevelName(v)
            setSelectedOffering(0)
          }}
          disabled={!hasMajorProgram || levelOptions.length === 0}
          placeholder="All levels"
          options={levelOptions}
        />
      </div>

      {unitOnly && (
        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          This narrows the program list. Pick a program to narrow the courses.
        </p>
      )}

      <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[1fr_140px_auto]">
        <div>
          <label className="mb-1 block text-xs font-medium text-foreground">
            Course offering
            {hasMajorProgram && !loadingList && ` (${offeringOptions.length})`}
          </label>
          <Combobox
            options={offeringOptions}
            value={selectedOffering || null}
            onChange={(v) => setSelectedOffering(v as number)}
            placeholder={
              !hasMajorProgram
                ? "Pick a major program first"
                : loadingList
                  ? "Loading courses…"
                  : "Search courses…"
            }
            searchPlaceholder="Type code or title…"
            emptyMessage={
              programId != null
                ? "No unassigned offerings of this program's courses"
                : "No unassigned offerings in this major program"
            }
            disabled={!hasMajorProgram || loadingList}
          />
        </div>
        <div>
          <label
            htmlFor="assign-role"
            className="mb-1 block text-xs font-medium text-foreground"
          >
            Role
          </label>
          <select
            id="assign-role"
            className={selectCls}
            value={role}
            onChange={(e) => setRole(e.target.value as TutorCourseRole)}
          >
            {TUTOR_ROLE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <Button
          onClick={handleAssign}
          disabled={!selectedOffering || assignCourse.isPending}
          className={cn("gap-2")}
        >
          {assignCourse.isPending ? (
            <Loader2 size={14} className="animate-spin" aria-hidden />
          ) : (
            <Plus size={14} aria-hidden />
          )}
          Assign
        </Button>
      </div>
      {offeringsQ.isError && (
        <p role="alert" className="text-xs text-destructive">
          Course offerings couldn&apos;t be loaded. Close and reopen to try
          again.
        </p>
      )}
    </div>
  )
}
