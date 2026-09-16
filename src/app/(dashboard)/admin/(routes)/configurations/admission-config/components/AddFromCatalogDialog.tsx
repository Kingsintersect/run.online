"use client"

import { useState } from "react"
import { FolderInput, Loader2 } from "lucide-react"
import Modal from "@/components/custom/Modal"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { getStepIcon } from "@/lib/admissionStepIcons"
import { STAGE_TYPE_CATALOG, resolveStageType } from "@/lib/admission-catalog"
import type {
  AdmissionStepDefinition,
  AdmissionStepGroup,
} from "@/types/admissionConfig"

interface AddFromCatalogDialogProps {
  open: boolean
  onClose: () => void
  group: AdmissionStepGroup
  groupLabel: string
  /** The major program this import targets — empty string while closed. */
  destinationName: string
  /** Institution-default steps of this group not yet adopted here — see
   *  step-scope.ts's catalogStepsNotAdopted. */
  catalogSteps: AdmissionStepDefinition[]
  onImport: (selected: AdmissionStepDefinition[]) => Promise<void>
  isImporting: boolean
}

/**
 * Major-Program Scoping — full decoupling (BACKEND_DEVIATIONS A23). The one
 * way steps get into a major program: multi-select import from the
 * institution-wide catalog ("All major programs" tab), never automatic
 * inheritance. Each imported step becomes its own independent row —
 * reordering, editing, and deleting it afterward never touches the catalog
 * original or any other major program's copy.
 *
 * Thin wrapper that only owns the Modal shell — `Body` is keyed on `group`
 * and only rendered while `open`, so it always mounts fresh with a clean
 * selection instead of syncing that back in an effect.
 */
export default function AddFromCatalogDialog({
  open,
  onClose,
  group,
  groupLabel,
  destinationName,
  catalogSteps,
  onImport,
  isImporting,
}: AddFromCatalogDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Add from Catalog — ${groupLabel}`}
      subtitle={
        destinationName
          ? `Pick which catalog steps ${destinationName} should have. Each becomes its own independent copy — nothing stays tied to the catalog or any other major program.`
          : undefined
      }
      size="md"
    >
      {open && (
        <Body
          key={group}
          group={group}
          destinationName={destinationName}
          catalogSteps={catalogSteps}
          onClose={onClose}
          onImport={onImport}
          isImporting={isImporting}
        />
      )}
    </Modal>
  )
}

function Body({
  group,
  destinationName,
  catalogSteps,
  onClose,
  onImport,
  isImporting,
}: {
  group: AdmissionStepGroup
  destinationName: string
  catalogSteps: AdmissionStepDefinition[]
  onClose: () => void
  onImport: (selected: AdmissionStepDefinition[]) => Promise<void>
  isImporting: boolean
}) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  const toggle = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const allSelected =
    catalogSteps.length > 0 && selectedIds.size === catalogSteps.length
  const toggleAll = () => {
    setSelectedIds(
      allSelected ? new Set() : new Set(catalogSteps.map((s) => s.id))
    )
  }

  const handleImport = async () => {
    const selected = catalogSteps.filter((s) => selectedIds.has(s.id))
    if (selected.length === 0) return
    await onImport(selected)
  }

  return (
    <div className="space-y-4">
      {catalogSteps.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
          <FolderInput className="size-6" />
          <p>
            {destinationName} has already adopted every catalog step in this
            group — or the catalog itself is empty. Create new steps in the
            Catalog view first.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <button
            type="button"
            onClick={toggleAll}
            className="text-xs font-medium text-primary hover:underline"
          >
            {allSelected ? "Clear all" : "Select all"}
          </button>
          <ul className="max-h-96 divide-y divide-border overflow-y-auto rounded-xl border border-border">
            {catalogSteps.map((step) => {
              const Icon = getStepIcon(step.icon)
              const stageType =
                group === "PROCESS" ? resolveStageType(step) : null
              const checked = selectedIds.has(step.id)
              return (
                <li key={step.id}>
                  <label className="flex cursor-pointer items-start gap-3 px-3 py-2.5 hover:bg-muted/40">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggle(step.id)}
                      className="mt-1"
                    />
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon size={14} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="text-sm font-medium text-foreground">
                          {step.label}
                        </p>
                        {stageType && (
                          <span className="rounded-full border border-primary/30 px-1.5 py-0.5 text-[10px] text-primary">
                            {STAGE_TYPE_CATALOG[stageType].label}
                          </span>
                        )}
                      </div>
                      {step.description && (
                        <p className="truncate text-xs text-muted-foreground">
                          {step.description}
                        </p>
                      )}
                    </div>
                  </label>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <div className="-mx-5 -mb-5 flex items-center justify-end gap-2 border-t border-border bg-muted/30 px-5 py-4">
        <Button variant="outline" onClick={onClose} disabled={isImporting}>
          Cancel
        </Button>
        <Button
          onClick={handleImport}
          disabled={isImporting || selectedIds.size === 0}
        >
          {isImporting && (
            <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
          )}
          Import Selected ({selectedIds.size})
        </Button>
      </div>
    </div>
  )
}
