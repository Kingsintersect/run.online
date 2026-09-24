"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAllPrograms } from "@/hooks/useCourseStructure"
import { useResultSchemes, useSchemeResolution } from "../../hooks/use-results"
import { useSetProgramScheme } from "../../hooks/use-results-mutations"
import { ProgramSchemeOverrideSchema } from "../../schemas"
import { toResultsApiError } from "../../lib/results-errors"
import { SelectField, toId } from "./select-field"
import type { Program } from "@/types/school"

const SOURCE_LABEL = {
  PROGRAM: "the program's own scheme",
  MAJOR_PROGRAM: "inherited from the major program's default",
  UNRESOLVED: "no scheme — results for this program can't be computed",
} as const

interface ProgramSchemeOverrideProps {
  majorProgramId: number | null
  canManage: boolean
}

// One program at a time: the resolver is a per-program endpoint, and
// calling it for every row would be exactly the N+1 fan-out CLAUDE.md §14
// rules out. While the resolver isn't live, the program record's own
// `gradingSchemeId` (real data) still shows whether it overrides.
export function ProgramSchemeOverride({
  majorProgramId,
  canManage,
}: ProgramSchemeOverrideProps) {
  const { data: programsRes } = useAllPrograms()
  const programs = (programsRes?.data ?? []).filter(
    (p) => majorProgramId == null || p.majorProgramId === majorProgramId
  )
  const [programId, setProgramId] = useState<number | null>(null)
  const program = programs.find((p) => p.id === programId) ?? null

  return (
    <div className="max-w-2xl space-y-4">
      <SelectField
        id="override-program"
        label="Program"
        value={programId ? String(programId) : ""}
        onChange={(v) => setProgramId(toId(v))}
        placeholder="Choose a program"
        options={programs.map((p) => ({
          value: String(p.id),
          label: `${p.code} — ${p.name}`,
        }))}
      />
      {program && (
        <ProgramOverrideEditor
          key={program.id}
          program={program}
          majorProgramId={majorProgramId}
          canManage={canManage}
        />
      )}
    </div>
  )
}

// Keyed by program, so the selector starts from that program's own scheme
// without syncing state in an effect.
function ProgramOverrideEditor({
  program,
  majorProgramId,
  canManage,
}: {
  program: Program
  majorProgramId: number | null
  canManage: boolean
}) {
  const resolution = useSchemeResolution(program.id)
  const schemes = useResultSchemes(majorProgramId)
  const setScheme = useSetProgramScheme()
  const [choice, setChoice] = useState<string>(
    program.gradingSchemeId ? String(program.gradingSchemeId) : ""
  )

  const schemeName = (id: number | null | undefined) =>
    (schemes.data ?? []).find((s) => s.id === id)?.name ??
    (id ? `Scheme #${id}` : null)

  const save = async () => {
    const body = ProgramSchemeOverrideSchema.parse({
      gradingSchemeId: toId(choice),
    })
    try {
      await setScheme.mutateAsync({
        programId: program.id,
        gradingSchemeId: body.gradingSchemeId,
      })
      toast.success(
        body.gradingSchemeId
          ? "Program now uses its own scheme."
          : "Program now inherits its major program's default."
      )
    } catch (error) {
      if (error instanceof Error) toast.error(toResultsApiError(error).message)
    }
  }

  const resolved = resolution.data?.available ? resolution.data.data : null

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-4">
      <div aria-live="polite">
        <p className="text-[11px] font-medium text-muted-foreground uppercase">
          Effective scheme
        </p>
        {resolution.isLoading ? (
          <p className="text-sm text-muted-foreground">Resolving…</p>
        ) : resolved ? (
          <p className="text-sm text-foreground">
            <strong>{resolved.scheme?.name ?? "None"}</strong>{" "}
            <span className="text-muted-foreground">
              — {SOURCE_LABEL[resolved.source]}
            </span>
          </p>
        ) : program.gradingSchemeId ? (
          <p className="text-sm text-foreground">
            <strong>{schemeName(program.gradingSchemeId)}</strong>{" "}
            <span className="text-muted-foreground">
              — the program&apos;s own scheme
            </span>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Inherits the major program&apos;s default (the resolver isn&apos;t
            live on the server yet, so the default itself can&apos;t be shown).
          </p>
        )}
      </div>

      {canManage && (
        <div className="flex flex-wrap items-end gap-3">
          <SelectField
            id="override-scheme"
            label="Program scheme"
            value={choice}
            onChange={setChoice}
            placeholder="Inherit from major program"
            options={(schemes.data ?? []).map((s) => ({
              value: String(s.id),
              label: s.name,
            }))}
            className="w-72"
          />
          <Button onClick={save} disabled={setScheme.isPending}>
            {setScheme.isPending && (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            )}
            Save
          </Button>
        </div>
      )}
    </div>
  )
}
