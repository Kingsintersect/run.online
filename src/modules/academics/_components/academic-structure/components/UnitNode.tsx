"use client"

import { useState } from "react"
import { toast } from "sonner"
import {
  ChevronDown,
  ChevronRight,
  Link2,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import StatusBadge from "@/components/custom/StatusBadge"
import {
  useAcademicUnits,
  useDeleteAcademicUnit,
} from "@/hooks/useAcademicStructure"
import type { AcademicUnit } from "@/types/school"

interface UnitNodeProps {
  unit: AcademicUnit
  canManage: boolean
  depth: number
  onAddChild: (parent: AcademicUnit) => void
  onEdit: (unit: AcademicUnit) => void
}

export function UnitNode({
  unit,
  canManage,
  depth,
  onAddChild,
  onEdit,
}: UnitNodeProps) {
  const [expanded, setExpanded] = useState(false)
  const hasChildren = unit.childCount > 0
  const { data, isLoading } = useAcademicUnits(
    { parentId: unit.id },
    { enabled: expanded }
  )
  const deleteUnit = useDeleteAcademicUnit()
  const children = data?.data ?? []

  const handleDelete = async () => {
    if (unit.childCount > 0) {
      toast.error("Remove or move this node's children first.")
      return
    }
    if (
      !window.confirm(
        `Delete "${unit.name}"? This won't affect any linked record or Moodle data.`
      )
    )
      return
    try {
      await deleteUnit.mutateAsync(unit.id)
      toast.success("Unit deleted")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete unit")
    }
  }

  return (
    <div>
      <div
        className="group flex items-center gap-2 rounded-xl border border-transparent px-2 py-2 hover:border-border hover:bg-muted/40"
        style={{ paddingLeft: `${depth * 1.5 + 0.5}rem` }}
      >
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          disabled={!hasChildren}
          className="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground disabled:opacity-0"
        >
          {expanded ? (
            <ChevronDown className="size-4" />
          ) : (
            <ChevronRight className="size-4" />
          )}
        </button>

        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="truncate text-sm font-medium text-foreground">
            {unit.name}
          </span>
          <StatusBadge label={unit.typeCode} variant="info" />
          {unit.linkedEntity ? (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Link2 className="size-3" /> {unit.linkedEntity.type} #
              {unit.linkedEntity.id}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">structural</span>
          )}
          {!unit.isActive && (
            <StatusBadge label="Inactive" variant="destructive" dot />
          )}
        </div>

        {canManage && (
          <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onAddChild(unit)}
              title="Add child node"
            >
              <Plus className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onEdit(unit)}
              title="Edit node"
            >
              <Pencil className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleDelete}
              disabled={deleteUnit.isPending}
              title="Delete node"
            >
              <Trash2 className="size-3.5 text-destructive" />
            </Button>
          </div>
        )}
      </div>

      {expanded && (
        <div>
          {isLoading ? (
            <div
              className="flex items-center gap-2 py-2 text-xs text-muted-foreground"
              style={{ paddingLeft: `${(depth + 1) * 1.5 + 0.5}rem` }}
            >
              <Loader2 className="size-3.5 animate-spin" /> Loading…
            </div>
          ) : children.length === 0 ? (
            <p
              className="py-2 text-xs text-muted-foreground"
              style={{ paddingLeft: `${(depth + 1) * 1.5 + 0.5}rem` }}
            >
              No child nodes.
            </p>
          ) : (
            children.map((child) => (
              <UnitNode
                key={child.id}
                unit={child}
                canManage={canManage}
                depth={depth + 1}
                onAddChild={onAddChild}
                onEdit={onEdit}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}
