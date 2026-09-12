"use client"

import { useMemo, useState } from "react"
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
const ENTITY_KINDS: AcademicUnitLinkKind[] = [
  "faculty",
  "department",
  "program",
  "level",
  "semester",
]

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
  const [parentId, setParentId] = useState<number | null>(null)
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
  const { data: sessions } = useAcademicSessions()
  const activeSessionId = useMemo(
    () => sessions?.find((s) => s.isActive)?.id ?? sessions?.[0]?.id ?? null,
    [sessions]
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
          description: f.code,
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
          description: p.code,
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
      default:
        return []
    }
  }, [
    entityKind,
    facultiesData,
    departmentsData,
    programsData,
    levelsData,
    semestersData,
  ])

  const parentOptions: ComboboxOption[] = (unitsData?.data ?? []).map((u) => ({
    value: u.id,
    label: u.name,
    description: u.typeCode,
  }))

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
                    <SelectItem key={k} value={k} className="capitalize">
                      {k}
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
                placeholder={`Select a ${entityKind}…`}
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
                value={parentId}
                onChange={(v) => setParentId(Number(v))}
                placeholder="Select a parent node…"
              />
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
