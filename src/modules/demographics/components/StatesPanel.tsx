"use client"

import { useState } from "react"
import { MapPin } from "lucide-react"
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
import { useCountries, useStates } from "../hooks/use-demographics"
import { useStateMutations } from "../hooks/use-demographics-mutations"
import { useDemographicsUiStore } from "../store/demographics-ui.store"
import { DemographicsEntityPanel } from "./DemographicsEntityPanel"
import EntityFormModal, { type EntityFormValues } from "./EntityFormModal"
import type { State } from "../types"

export function StatesPanel() {
  const { data: countries = [] } = useCountries()
  const selectedCountryId = useDemographicsUiStore((s) => s.selectedCountryId)
  const setSelectedCountry = useDemographicsUiStore((s) => s.setSelectedCountry)

  const { data: states = [], isLoading, isError } = useStates(selectedCountryId)
  const { create, update, remove } = useStateMutations()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<State | null>(null)
  const [deleting, setDeleting] = useState<State | null>(null)

  const isMutating = create.isPending || update.isPending || remove.isPending

  const handleSubmit = async (values: EntityFormValues) => {
    if (!selectedCountryId) return
    try {
      if (editing) {
        await update.mutateAsync({
          id: editing.id,
          payload: {
            name: values.name,
            code: values.code || undefined,
            isActive: values.isActive,
          },
        })
        toast.success("State updated")
      } else {
        await create.mutateAsync({
          countryId: selectedCountryId,
          name: values.name,
          code: values.code || undefined,
          isActive: values.isActive,
        })
        toast.success("State created")
      }
      setFormOpen(false)
      setEditing(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save state")
    }
  }

  const handleToggle = async (item: State, next: boolean) => {
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
      toast.error(err instanceof Error ? err.message : "Failed to delete state")
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Viewing states in</Label>
        <Select
          value={selectedCountryId ? String(selectedCountryId) : ""}
          onValueChange={(val) => setSelectedCountry(Number(val))}
        >
          <SelectTrigger className="w-full sm:w-72">
            <SelectValue placeholder="Select a country first" />
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

      <DemographicsEntityPanel
        title="States"
        description="States/provinces belonging to the selected country."
        icon={MapPin}
        items={states}
        isLoading={isLoading}
        isError={isError}
        isMutating={isMutating}
        disabledReason={
          selectedCountryId
            ? undefined
            : "Select a country above to manage its states"
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
        title="State"
        nameLabel="State Name"
        namePlaceholder="e.g. Lagos"
        showCode
        editing={editing}
        onSubmit={handleSubmit}
        isSubmitting={create.isPending || update.isPending}
      />

      <Modal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete state"
        subtitle={
          deleting
            ? `Remove "${deleting.name}"? This fails if it still has local governments.`
            : undefined
        }
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
