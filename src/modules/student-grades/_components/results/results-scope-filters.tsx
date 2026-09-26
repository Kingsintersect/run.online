"use client"

import { Info } from "lucide-react"
import { useResultsUiStore } from "../../store/results-ui.store"
import type { ResultsScope } from "../../hooks/use-results-scope"
import { SelectField, toId } from "./select-field"
import { SemesterPicker } from "./semester-picker"

export const SCOPE_FIELD_IDS = {
  majorProgram: "ws-major-program",
  session: "ws-session",
  semester: "ws-semester",
} as const

const PICK_MAJOR_PROGRAM = "Pick a major program first"

interface ResultsScopeFiltersProps {
  scope: ResultsScope
}

// Step 1 of the admin workspace: major program → its structure (the levels
// its academic-unit tree actually has) → academic session → semester. Nothing below the
// major program is enabled until one is picked; each change clears the
// levels below it (useResultsUiStore's cascade).
export function ResultsScopeFilters({ scope }: ResultsScopeFiltersProps) {
  const w = useResultsUiStore((s) => s.workspace)
  const setWorkspace = useResultsUiStore((s) => s.setWorkspace)
  const hasMajorProgram = w.majorProgramId != null
  const { structure } = scope
  const structureLoading = hasMajorProgram && structure.isLoading

  return (
    <fieldset className="min-w-0 space-y-3">
      <legend className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        Scope
      </legend>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SelectField
          id={SCOPE_FIELD_IDS.majorProgram}
          label="Major program"
          value={w.majorProgramId ? String(w.majorProgramId) : ""}
          onChange={(v) => setWorkspace({ majorProgramId: toId(v) })}
          placeholder={
            scope.loadingMajorPrograms ? "Loading…" : "Choose a major program"
          }
          options={scope.majorProgramOptions}
          disabled={scope.singleMajorProgram}
        />
        {/* One picker per level this major program's tree actually has,
            labelled with the tree's own unit type (Faculty, Department…). */}
        {structure.levels.map((level) => (
          <SelectField
            key={`${w.majorProgramId}-${level.depth}`}
            id={`ws-unit-${level.depth}`}
            label={level.label}
            value={level.selectedId ? String(level.selectedId) : ""}
            onChange={(v) => scope.selectUnit(level.depth, toId(v))}
            placeholder={`All (${level.options.length})`}
            options={level.options.map((o) => ({
              value: String(o.id),
              label: o.name,
            }))}
          />
        ))}
        <SelectField
          id="ws-program"
          label="Program"
          value={w.programId ? String(w.programId) : ""}
          onChange={(v) => setWorkspace({ programId: toId(v) })}
          disabled={!hasMajorProgram || structureLoading}
          placeholder={
            !hasMajorProgram
              ? PICK_MAJOR_PROGRAM
              : structureLoading
                ? "Loading…"
                : scope.programOptions.length === 0
                  ? "No programs"
                  : "All programs"
          }
          options={scope.programOptions}
        />
        <SemesterPicker
          idPrefix="ws"
          majorProgramId={w.majorProgramId}
          sessionDisabledReason={hasMajorProgram ? null : PICK_MAJOR_PROGRAM}
          sessionId={w.sessionId}
          semesterId={w.semesterId}
          onSessionChange={(sessionId) => setWorkspace({ sessionId })}
          onSemesterChange={(semesterId) => setWorkspace({ semesterId })}
        />
      </div>
      {scope.unitOnly && (
        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          This narrows the program list. Pick a program to narrow the offerings:
          the results list can only filter by program or department.
        </p>
      )}
    </fieldset>
  )
}
