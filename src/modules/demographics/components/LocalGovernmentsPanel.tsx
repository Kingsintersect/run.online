"use client"

import { useState } from "react"
import { Landmark } from "lucide-react"
import { toast } from "sonner"
import Modal from "@/components/custom/Modal"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  useCountries,
  useStates,
  useLocalGovernments,
} from "../hooks/use-demographics"
import { useLocalGovernmentMutations } from "../hooks/use-demographics-mutations"
import { useDemographicsUiStore } from "../store/demographics-ui.store"
import { DemographicsEntityPanel } from "./DemographicsEntityPanel"
import EntityFormModal, { type EntityFormValues } from "./EntityFormModal"
import type { LocalGovernment } from "../types"

export function LocalGovernmentsPanel() {
  const { data: countries = [] } = useCountries()
  const selectedCountryId = useDemographicsUiStore((s) => s.selectedCountryId)
  const selectedStateId = useDemographicsUiStore((s) => s.selectedStateId)
  const setSelectedCountry = useDemographicsUiStore((s) => s.setSelectedCountry)
  const setSelectedState = useDemographicsUiStore((s) => s.setSelectedState)

  const { data: states = [] } = useStates(selectedCountryId)
  const {
    data: lgas = [],
    isLoading,
    isError,
  } = useLocalGovernments(selectedStateId)
  const { create, update, remove } = useLocalGovernmentMutations()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<LocalGovernment | null>(null)
  const [deleting, setDeleting] = useState<LocalGovernment | null>(null)

  const isMutating = create.isPending || update.isPending || remove.isPending

  const handleSubmit = async (values: EntityFormValues) => {
    if (!selectedStateId) return
    try {
      if (editing) {
        await update.mutateAsync({
          id: editing.id,
          payload: { name: values.name, isActive: values.isActive },
        })
        toast.success("Local government updated")
      } else {
        await create.mutateAsync({
          stateId: selectedStateId,
          name: values.name,
          isActive: values.isActive,
        })
        toast.success("Local government created")
      }
      setFormOpen(false)
      setEditing(null)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save local government"
      )
    }
  }

  const handleToggle = async (item: LocalGovernment, next: boolean) => {
    try {
      await update.mutateAsync({ id: item.id, payload: { isActive: next } })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update")
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleting) return
    try {
      await remove.mutateAsync(deleting.id)
      toast.success(`"${deleting.name}" deleted`)
      setDeleting(null)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete local government"
      )
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Country</Label>
          <Select
            value={selectedCountryId ? String(selectedCountryId) : ""}
            onValueChange={(val) => setSelectedCountry(Number(val))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a country" />
            </SelectTrigger>
            <SelectContent>
              {countries.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>State</Label>
          <Select
            value={selectedStateId ? String(selectedStateId) : ""}
            onValueChange={(val) => setSelectedState(Number(val))}
            disabled={!selectedCountryId}
          >
            <SelectTrigger className="w-full">
              <SelectValue
                placeholder={
                  selectedCountryId
                    ? "Select a state"
                    : "Select a country first"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {states.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <DemographicsEntityPanel
        title="Local Governments"
        description="LGAs belonging to the selected state."
        icon={Landmark}
        items={lgas}
        isLoading={isLoading}
        isError={isError}
        isMutating={isMutating}
        disabledReason={
          selectedStateId
            ? undefined
            : "Select a country and state above to manage local governments"
        }
        onToggle={handleToggle}
        onEdit={(item) => {
          setEditing(item)
          setFormOpen(true)
        }}
        onDelete={setDeleting}
        onAdd={() => {
          setEditing(null)
          setFormOpen(true)
        }}
      />

      <EntityFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title="Local Government"
        nameLabel="Local Government Name"
        namePlaceholder="e.g. Ikeja"
        editing={editing}
        onSubmit={handleSubmit}
        isSubmitting={create.isPending || update.isPending}
      />

      <Modal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete local government"
        subtitle={deleting ? `Remove "${deleting.name}"?` : undefined}
        size="sm"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setDeleting(null)}
              disabled={remove.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={remove.isPending}
            >
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          This can&apos;t be undone.
        </p>
      </Modal>
    </div>
  )
}
