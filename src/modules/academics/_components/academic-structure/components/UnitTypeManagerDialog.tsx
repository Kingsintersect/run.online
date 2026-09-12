"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Loader2, Plus, Tag } from "lucide-react"
import Modal from "@/components/custom/Modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import EmptyState from "@/components/custom/EmptyState"
import { useCreateUnitType, useUnitTypes } from "@/hooks/useAcademicStructure"

interface UnitTypeManagerDialogProps {
  open: boolean
  onClose: () => void
}

// Admins add a custom node type here (e.g. "Cohort") if the seeded set
// (Faculty/Department/Program/Level/Semester/School/Section/Stream/Term)
// doesn't cover their institution's structure — see
// sandbox/schema-moodel-sync-refactor/api-v2.md §"Academic Structure".
export function UnitTypeManagerDialog({
  open,
  onClose,
}: UnitTypeManagerDialogProps) {
  const { data, isLoading } = useUnitTypes()
  const createType = useCreateUnitType()
  const [code, setCode] = useState("")
  const [label, setLabel] = useState("")

  const types = data?.data ?? []

  const handleCreate = async () => {
    if (!code.trim() || !label.trim()) return
    try {
      await createType.mutateAsync({
        code: code.trim().toUpperCase(),
        label: label.trim(),
      })
      toast.success("Node type created")
      setCode("")
      setLabel("")
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create node type"
      )
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Node Types"
      subtitle="The kinds of node your structure tree can contain"
      size="md"
    >
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-5 animate-spin text-primary" />
          </div>
        ) : types.length === 0 ? (
          <EmptyState icon={Tag} title="No node types yet" />
        ) : (
          <div className="flex flex-wrap gap-2">
            {types.map((t) => (
              <span
                key={t.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-foreground"
              >
                {t.label}
                <span className="text-muted-foreground">{t.code}</span>
              </span>
            ))}
          </div>
        )}

        <div className="space-y-2 rounded-xl border border-dashed border-border p-3">
          <p className="text-xs font-medium text-muted-foreground">
            Add a custom node type
          </p>
          <div className="grid grid-cols-[1fr_1.5fr_auto] gap-2">
            <div className="space-y-1">
              <Label htmlFor="unit-type-code" className="sr-only">
                Code
              </Label>
              <Input
                id="unit-type-code"
                placeholder="COHORT"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="unit-type-label" className="sr-only">
                Label
              </Label>
              <Input
                id="unit-type-label"
                placeholder="Cohort"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </div>
            <Button
              size="icon"
              onClick={handleCreate}
              disabled={createType.isPending || !code.trim() || !label.trim()}
            >
              {createType.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
