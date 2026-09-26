"use client"

import { useEffect } from "react"
import { cn } from "@/lib/utils"
import type {
  MyTeachingScope,
  TeachingScopeMajorProgram,
} from "@/hooks/use-my-teaching-scope"

const selectCls =
  "w-full appearance-none rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-muted/20"

const REASON_LABEL = { teaches: "you teach", heads: "you head" } as const

function reasonText(mp: TeachingScopeMajorProgram) {
  return mp.reasons.map((r) => REASON_LABEL[r]).join(" · ")
}

interface TeachingScopeSelectProps {
  scope: MyTeachingScope
  majorProgramId: number | null
  programId: number | null
  onChange: (next: {
    majorProgramId: number | null
    programId: number | null
  }) => void
  idPrefix: string
  className?: string
}

/**
 * Major program → program, offering only what the user teaches in or heads
 * (useMyTeachingScope). A single option is picked automatically. "All my
 * programs" is offered only where the user heads the major program; where
 * they only teach, they pick one of their programs, so a list never widens
 * past their own programs.
 */
export function TeachingScopeSelect({
  scope,
  majorProgramId,
  programId,
  onChange,
  idPrefix,
  className,
}: TeachingScopeSelectProps) {
  const current = scope.majorPrograms.find((mp) => mp.id === majorProgramId)
  const heads = current?.reasons.includes("heads") ?? false
  const programs = current?.programs ?? []

  // Pick the only option, and drop a choice that's no longer in scope.
  const onlyMajor =
    scope.majorPrograms.length === 1 ? scope.majorPrograms[0].id : null
  const onlyProgram = !heads && programs.length === 1 ? programs[0].id : null
  const staleMajor =
    !scope.isLoading && majorProgramId != null && current == null
  const staleProgram =
    programId != null &&
    current != null &&
    !programs.some((p) => p.id === programId)
  useEffect(() => {
    if (scope.isLoading) return
    if (staleMajor) onChange({ majorProgramId: onlyMajor, programId: null })
    else if (majorProgramId == null && onlyMajor != null)
      onChange({ majorProgramId: onlyMajor, programId: null })
    else if (staleProgram) onChange({ majorProgramId, programId: onlyProgram })
    else if (programId == null && onlyProgram != null)
      onChange({ majorProgramId, programId: onlyProgram })
  }, [
    scope.isLoading,
    staleMajor,
    staleProgram,
    onlyMajor,
    onlyProgram,
    majorProgramId,
    programId,
    onChange,
  ])

  return (
    <div className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2", className)}>
      <div>
        <label
          htmlFor={`${idPrefix}-major-program`}
          className="mb-1 block text-xs font-medium text-foreground"
        >
          Major program
        </label>
        <select
          id={`${idPrefix}-major-program`}
          className={selectCls}
          value={majorProgramId ?? ""}
          disabled={scope.isLoading || scope.majorPrograms.length === 0}
          onChange={(e) =>
            onChange({
              majorProgramId: e.target.value ? Number(e.target.value) : null,
              programId: null,
            })
          }
        >
          <option value="">
            {scope.isLoading
              ? "Loading your programs…"
              : scope.majorPrograms.length === 0
                ? "None in your scope"
                : "Choose a major program"}
          </option>
          {scope.majorPrograms.map((mp) => (
            <option key={mp.id} value={mp.id}>
              {mp.name} ({reasonText(mp)})
            </option>
          ))}
        </select>
      </div>
      <div>
        <label
          htmlFor={`${idPrefix}-program`}
          className="mb-1 block text-xs font-medium text-foreground"
        >
          Program
        </label>
        <select
          id={`${idPrefix}-program`}
          className={selectCls}
          value={programId ?? ""}
          disabled={current == null || programs.length === 0}
          onChange={(e) =>
            onChange({
              majorProgramId,
              programId: e.target.value ? Number(e.target.value) : null,
            })
          }
        >
          <option value="" disabled={!heads && programs.length > 0}>
            {current == null
              ? "Pick a major program first"
              : programs.length === 0
                ? "No programs found"
                : heads
                  ? "All programs you head"
                  : "Choose one of your programs"}
          </option>
          {programs.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
