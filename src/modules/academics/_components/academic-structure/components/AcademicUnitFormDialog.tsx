"use client"

import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import Modal from "@/components/custom/Modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import Combobox, { type ComboboxOption } from "@/components/custom/Combobox"
import {
  useAcademicUnits,
  useCreateAcademicUnit,
  useUnitTypes,
  useUpdateAcademicUnit,
} from "@/hooks/useAcademicStructure"
import {
  useAllDepartments,
  useAllPrograms,
  useFaculties,
  useLevels,
} from "@/hooks/useCourseStructure"
import { semesterApi } from "@/services/feeManagementApi"
import type { AcademicUnit, AcademicUnitLinkKind } from "@/types/school"

// Sentinel for "no parent (root node)" in the re-parent Combobox, which
// only deals in string | number values, never null.
const ROOT_SENTINEL = "_ROOT_"

interface AcademicUnitFormDialogProps {
  open: boolean
  onClose: () => void
  parent: AcademicUnit | null // null = creating a root node
  unit?: AcademicUnit | null // present = editing
}

// Types with a real backing table — see school.d.ts's AcademicUnitLinkKind
// and sandbox/schema-moodel-sync-refactor/README.md §3. Any other type code
// (SCHOOL, SECTION, STREAM, TERM, or a custom one) is always a pure
// structural node — there's nothing for it to link to.
const LINKABLE_TYPE_CODES: Record<string, AcademicUnitLinkKind> = {
  FACULTY: "faculty",
  DEPARTMENT: "department",
  PROGRAM: "program",
  LEVEL: "level",
  SEMESTER: "semester",
}

// Thin wrapper that only owns the Modal shell. `Body` is keyed on the
// target it's editing/creating under so it remounts fresh per target —
// letting its useState hooks read initial values straight from props
// instead of syncing them back in an effect (see
// https://react.dev/learn/you-might-not-need-an-effect).
export function AcademicUnitFormDialog({
  open,
  onClose,
  parent,
  unit,
}: AcademicUnitFormDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        unit
          ? "Edit Node"
          : parent
            ? `Add child of "${parent.name}"`
            : "Add Root Node"
      }
      subtitle="Structural nodes have no backing record; mirror nodes link to a real Faculty/Department/Program/Level/Semester."
      size="md"
    >
      {open && (
        <FormBody
          key={unit?.id ?? `new-${parent?.id ?? "root"}`}
          onClose={onClose}
          parent={parent}
          unit={unit}
        />
      )}
    </Modal>
  )
}

function FormBody({
  onClose,
  parent,
  unit,
}: {
  onClose: () => void
  parent: AcademicUnit | null
  unit?: AcademicUnit | null
}) {
  const isEditing = !!unit
  const { data: typesData } = useUnitTypes()
  const types = typesData?.data ?? []

  const createUnit = useCreateAcademicUnit()
  const updateUnit = useUpdateAcademicUnit()
  const isPending = createUnit.isPending || updateUnit.isPending

  const [typeCode, setTypeCode] = useState(unit?.typeCode ?? "")
  const [name, setName] = useState(unit?.name ?? "")
  const [sortOrder, setSortOrder] = useState(unit?.sortOrder ?? 0)
  const [linkEntityId, setLinkEntityId] = useState<number | null>(
    unit?.linkedEntity?.id ?? null
  )
  // Re-parenting — editing only. Moving a node was previously impossible
  // once created (this form only ever sent name/sortOrder), which is a big
  // part of why the tree pulled in from Moodle ends up scattered: a
  // "resolve" that lands a category at the root has no way to be fixed
  // afterward except deleting and recreating it.
  const [parentId, setParentId] = useState<number | null>(
    unit?.parentId ?? parent?.id ?? null
  )
  const parentComboboxValue = parentId ?? ROOT_SENTINEL
  const { data: allUnitsData } = useAcademicUnits(undefined, {
    enabled: isEditing,
  })

  const entityKind = LINKABLE_TYPE_CODES[typeCode]

  // A node can't become its own parent, nor a descendant of itself (that
  // would create a cycle) — walk the flat list to exclude the unit and
  // everything under it from the picker.
  const parentOptions: ComboboxOption[] = useMemo(() => {
    if (!isEditing || !unit) return []
    const all = allUnitsData?.data ?? []
    const excluded = new Set<number>([unit.id])
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
      {
        value: ROOT_SENTINEL,
        label: "— No parent (root node) —",
      },
      ...all
        .filter((u) => !excluded.has(u.id))
        .map((u) => ({ value: u.id, label: u.name, description: u.typeCode })),
    ]
  }, [isEditing, unit, allUnitsData])

  const { data: facultiesData } = useFaculties()
  const { data: departmentsData } = useAllDepartments()
  const { data: programsData } = useAllPrograms()
  const { data: levelsData } = useLevels()
  const { data: semestersData } = useQuery({
    queryKey: ["academic-structure", "all-semesters-for-linking"],
    // The backend's SemesterController::index() ignores the filter param
    // and returns every semester regardless of the id passed — see
    // feeManagementApi.ts's listBySession comment. Reused here rather than
    // standing up a second real endpoint just for this picker.
    queryFn: () => semesterApi.listBySession(0),
    enabled: entityKind === "semester",
  })

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
        return (semestersData?.data ?? []).map((s) => ({
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

  const handleSubmit = async () => {
    if (!typeCode.trim() || !name.trim()) {
      toast.error("Pick a node type and enter a name.")
      return
    }
    try {
      if (isEditing && unit) {
        await updateUnit.mutateAsync({
          id: unit.id,
          payload: { name: name.trim(), sortOrder, parentId },
        })
        toast.success("Node updated")
      } else {
        await createUnit.mutateAsync({
          typeCode,
          parentId: parent?.id ?? null,
          name: name.trim(),
          sortOrder,
          linkedEntity:
            entityKind && linkEntityId !== null
              ? { type: entityKind, id: linkEntityId }
              : null,
        })
        toast.success("Node created")
      }
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save node")
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Node Type</Label>
        <Select
          value={typeCode}
          onValueChange={setTypeCode}
          disabled={isEditing}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a type" />
          </SelectTrigger>
          <SelectContent>
            {types.map((t) => (
              <SelectItem key={t.id} value={t.code}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isEditing && (
          <p className="text-xs text-muted-foreground">
            Type can&apos;t change after creation — delete and recreate instead.
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="unit-name">Name</Label>
        <Input
          id="unit-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Senior Secondary"
        />
      </div>

      {isEditing && (
        <div className="space-y-1.5">
          <Label>Parent Node</Label>
          <Combobox
            options={parentOptions}
            value={parentComboboxValue}
            onChange={(v) =>
              setParentId(v === ROOT_SENTINEL ? null : Number(v))
            }
            placeholder="Select a parent…"
          />
          <p className="text-xs text-muted-foreground">
            Move this node under a different parent, or clear it to make it a
            root node.
          </p>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="unit-sort">Sort Order</Label>
        <Input
          id="unit-sort"
          type="number"
          className="max-w-32"
          value={sortOrder}
          onChange={(e) => setSortOrder(Number(e.target.value))}
        />
      </div>

      {!isEditing && entityKind && (
        <div className="space-y-1.5 rounded-xl border border-dashed border-border p-3">
          <Label>Link to an existing {entityKind}</Label>
          <Combobox
            options={entityOptions}
            value={linkEntityId}
            onChange={(v) => {
              setLinkEntityId(Number(v))
              const opt = entityOptions.find((o) => o.value === v)
              if (opt && !name.trim()) setName(opt.label)
            }}
            placeholder={`Select a ${entityKind}…`}
          />
          <p className="text-xs text-muted-foreground">
            Optional — leave unset to create a pure structural node instead
            (e.g. a Stream or Section with no dedicated record).
          </p>
        </div>
      )}

      {isEditing && unit?.linkedEntity && (
        <p className="text-xs text-muted-foreground">
          Linked to {unit.linkedEntity.type} #{unit.linkedEntity.id} — linked
          entity can&apos;t change after creation.
        </p>
      )}

      <div className="-mx-5 mt-4 -mb-5 flex items-center justify-end gap-2 border-t border-border bg-muted/30 px-5 py-4">
        <Button variant="outline" onClick={onClose} disabled={isPending}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isPending}>
          {isPending && (
            <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
          )}
          {isEditing ? "Save Changes" : "Create Node"}
        </Button>
      </div>
    </div>
  )
}
