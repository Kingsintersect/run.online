"use client"

import { useCallback, useMemo, useState } from "react"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import Modal from "@/components/custom/Modal"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import Combobox, { type ComboboxOption } from "@/components/custom/Combobox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAcademicUnits, useUnitTypes } from "@/hooks/useAcademicStructure"
import {
  useAllDepartments,
  useAllPrograms,
  useFaculties,
  useLevels,
  useMajorPrograms,
} from "@/hooks/useCourseStructure"
import { useAcademicSessions } from "@/hooks/useAcademicSessions"
import { useSemesters } from "@/hooks/useSemesters"
import { useResolveCategoryMapping } from "../../hooks/use-sync-mutations"
import type { CategorySyncResponse } from "../../types"
import type { AcademicUnitLinkKind } from "@/types/school"

interface CategoryResolveDialogProps {
  category: CategorySyncResponse | null
  onClose: () => void
}

// AcademicUnitLinkKind includes "semester" — it was missing here, which made
// a pulled Semester category (e.g. "First Semester") permanently
// unresolvable: there was no way to even select the right kind of entity to
// link it to.
// "major_program" — sandbox/major-program-scoping/: lets an admin manually
// resolve a category to a MajorProgram root node.
const ENTITY_KINDS: AcademicUnitLinkKind[] = [
  "faculty",
  "department",
  "program",
  "level",
  "semester",
  "major_program",
]

// Sentinel for "no parent (root node)" in the structural-mode parent
// Combobox, which only deals in string | number values, never null.
const ROOT_SENTINEL = "_ROOT_"

const ENTITY_KIND_LABELS: Record<AcademicUnitLinkKind, string> = {
  faculty: "Faculty",
  department: "Department",
  program: "Program",
  level: "Level",
  semester: "Semester",
  major_program: "Major Program",
}

// Resolves one flagged (needsMapping: true) row pulled from Moodle with no
// recognizable idnumber — either link it to a real entity, or fix it up as
// a pure structural node. See sandbox/schema-moodel-sync-refactor/api-v2.md
// §"POST /moodle-sync/categories/{id}/resolve".
export function CategoryResolveDialog({
  category,
  onClose,
}: CategoryResolveDialogProps) {
  const [mode, setMode] = useState<"link" | "structural">("link")
  const [entityKind, setEntityKind] = useState<AcademicUnitLinkKind>("faculty")
  const [entityId, setEntityId] = useState<number | null>(null)
  const [typeCode, setTypeCode] = useState("")
  // Default to the parent AcademicUnit the backend already knows this
  // category's Moodle parent resolved to (`category.parentId`), rather than
  // always defaulting to root — this is why "fix as structural node" kept
  // landing deeply-nested Moodle categories (e.g. a Program four levels
  // down) as top-level nodes: nothing pre-filled the real parent. Still
  // freely editable below; null (root) if the parent hasn't been resolved
  // yet, which is legitimate — resolve top-down when possible.
  const [parentId, setParentId] = useState<number | null>(
    category?.parentId ?? null
  )
  // Semesters are scoped per academic session (unlike Faculty/Department/
  // Program/Level, which are global) — need a session picked before the
  // Entity combobox has anything to look up.
  const [sessionId, setSessionId] = useState<number | null>(null)

  const resolve = useResolveCategoryMapping()
  const { data: typesData } = useUnitTypes()
  const { data: unitsData } = useAcademicUnits(undefined, {
    enabled: !!category && mode === "structural",
  })
  const { data: facultiesData } = useFaculties()
  const { data: departmentsData } = useAllDepartments()
  const { data: programsData } = useAllPrograms()
  const { data: levelsData } = useLevels()
  const { data: majorProgramsData } = useMajorPrograms()
  const { data: sessions } = useAcademicSessions()
  const activeSessionId = useMemo(
    () => sessions?.find((s) => s.isActive)?.id ?? sessions?.[0]?.id ?? null,
    [sessions]
  )
  // Multiple major programs can each run their own session named e.g.
  // "2026/2027" — without this, the picker below can't tell them apart.
  const majorProgramNameById = useMemo(
    () =>
      new Map((majorProgramsData?.data ?? []).map((mp) => [mp.id, mp.name])),
    [majorProgramsData]
  )
  const sessionScopeLabel = useCallback(
    (majorProgramId: number | null | undefined) =>
      majorProgramId != null
        ? (majorProgramNameById.get(majorProgramId) ?? "Unknown major program")
        : "Institution-wide",
    [majorProgramNameById]
  )
  // Default to the active session until the admin explicitly picks another one.
  const effectiveSessionId = sessionId ?? activeSessionId
  const { data: semestersData } = useSemesters(effectiveSessionId)

  const entityOptions: ComboboxOption[] = useMemo(() => {
    switch (entityKind) {
      case "faculty":
        return (facultiesData?.data ?? []).map((f) => ({
          value: f.id,
          label: f.name,
          description:
            f.majorProgramId != null
              ? `${f.code} — ${sessionScopeLabel(f.majorProgramId)}`
              : f.code,
        }))
      case "department":
        return (departmentsData?.data ?? []).map((d) => ({
          value: d.id,
          label: d.name,
          description: d.code,
        }))
      case "program":
        return (programsData?.data ?? []).map((p) => ({
          value: p.id,
          label: p.name,
          description:
            p.majorProgramId != null
              ? `${p.code} — ${sessionScopeLabel(p.majorProgramId)}`
              : p.code,
        }))
      case "level":
        return (levelsData?.data ?? []).map((l) => ({
          value: l.id,
          label: l.name,
        }))
      case "semester":
        return (semestersData ?? []).map((s) => ({
          value: s.id,
          label: s.name,
        }))
      case "major_program":
        return (majorProgramsData?.data ?? []).map((mp) => ({
          value: mp.id,
          label: mp.name,
          description: mp.code,
        }))
      default:
        return []
    }
  }, [
    entityKind,
    facultiesData,
    departmentsData,
    programsData,
    levelsData,
    majorProgramsData,
    semestersData,
    sessionScopeLabel,
  ])

  // A category can't be re-parented under its own placeholder AcademicUnit
  // node (or anything already under that node) — every pulled category,
  // even an unresolved one, already has a bare placeholder row at
  // `category.academicUnitId`, so exclude it and its descendants the same
  // way AcademicUnitFormDialog's re-parent picker does.
  const parentOptions: ComboboxOption[] = useMemo(() => {
    const all = unitsData?.data ?? []
    const selfId = category?.academicUnitId
    const excluded = new Set<number>(selfId != null ? [selfId] : [])
    let added = true
    while (added) {
      added = false
      for (const u of all) {
        if (
          u.parentId != null &&
          excluded.has(u.parentId) &&
          !excluded.has(u.id)
        ) {
          excluded.add(u.id)
          added = true
        }
      }
    }
    return [
      { value: ROOT_SENTINEL, label: "— No parent (root node) —" },
      ...all
        .filter((u) => !excluded.has(u.id))
        .map((u) => ({ value: u.id, label: u.name, description: u.typeCode })),
    ]
  }, [unitsData, category])
  const parentComboboxValue = parentId ?? ROOT_SENTINEL

  const handleResolve = async () => {
    if (!category) return
    try {
      if (mode === "link") {
        if (entityId === null) {
          toast.error("Pick an entity to link to.")
          return
        }
        await resolve.mutateAsync({
          id: category.id,
          dto: { linkedEntity: { type: entityKind, id: entityId } },
        })
      } else {
        if (!typeCode.trim()) {
          toast.error("Pick a node type.")
          return
        }
        await resolve.mutateAsync({
          id: category.id,
          dto: { typeCode, parentId },
        })
      }
      toast.success("Category resolved")
      onClose()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to resolve category"
      )
    }
  }

  return (
    <Modal
      open={!!category}
      onClose={onClose}
      title="Resolve Category"
      subtitle={
        category
          ? `"${category.moodleCategoryName}" has no recognizable idnumber`
          : undefined
      }
      size="md"
      footer={
        <>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={resolve.isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleResolve} disabled={resolve.isPending}>
            {resolve.isPending && (
              <Loader2
                className="size-4 animate-spin"
                data-icon="inline-start"
              />
            )}
            Resolve
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {category?.syncError && (
          <p className="rounded-lg bg-destructive/10 p-2 text-xs text-destructive">
            {category.syncError}
          </p>
        )}

        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => setMode("link")}
            className={
              mode === "link"
                ? "rounded-lg border border-primary bg-primary/10 px-2 py-1.5 text-xs font-medium text-primary"
                : "rounded-lg border border-border px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted"
            }
          >
            Link to existing entity
          </button>
          <button
            type="button"
            onClick={() => setMode("structural")}
            className={
              mode === "structural"
                ? "rounded-lg border border-primary bg-primary/10 px-2 py-1.5 text-xs font-medium text-primary"
                : "rounded-lg border border-border px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted"
            }
          >
            Fix as structural node
          </button>
        </div>

        {mode === "link" ? (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Entity Kind</Label>
              <Select
                value={entityKind}
                onValueChange={(v) => {
                  setEntityKind(v as AcademicUnitLinkKind)
                  setEntityId(null)
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENTITY_KINDS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {ENTITY_KIND_LABELS[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {entityKind === "semester" && (
              <div className="space-y-1.5">
                <Label>Academic Session</Label>
                <Select
                  value={effectiveSessionId ? String(effectiveSessionId) : ""}
                  onValueChange={(v) => {
                    setSessionId(Number(v))
                    setEntityId(null)
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a session" />
                  </SelectTrigger>
                  <SelectContent>
                    {(sessions ?? []).map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name}
                        <span className="ml-1.5 text-xs text-muted-foreground">
                          — {sessionScopeLabel(s.majorProgramId)}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Entity</Label>
              <Combobox
                options={entityOptions}
                value={entityId}
                onChange={(v) => setEntityId(Number(v))}
                placeholder={`Select a ${ENTITY_KIND_LABELS[entityKind]}…`}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Node Type</Label>
              <Select value={typeCode} onValueChange={setTypeCode}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a type" />
                </SelectTrigger>
                <SelectContent>
                  {(typesData?.data ?? []).map((t) => (
                    <SelectItem key={t.id} value={t.code}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Parent Node (optional)</Label>
              <Combobox
                options={parentOptions}
                value={parentComboboxValue}
                onChange={(v) =>
                  setParentId(v === ROOT_SENTINEL ? null : Number(v))
                }
                placeholder="Select a parent node…"
              />
              {category?.parentMoodleCategoryId != null && (
                <p className="text-xs text-muted-foreground">
                  {category.parentId != null
                    ? "Pre-filled to match this category's Moodle parent."
                    : "This category has a Moodle parent that hasn't been resolved yet — resolving that one first will let this default correctly instead of landing at root."}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
