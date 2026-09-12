"use client"

import { useState } from "react"
import { Globe2 } from "lucide-react"
import { toast } from "sonner"
import Modal from "@/components/custom/Modal"
import { Button } from "@/components/ui/button"
import { useCountries } from "../hooks/use-demographics"
import { useCountryMutations } from "../hooks/use-demographics-mutations"
import { DemographicsEntityPanel } from "./DemographicsEntityPanel"
import EntityFormModal, { type EntityFormValues } from "./EntityFormModal"
import type { Country } from "../types"

export function CountriesPanel() {
  const { data: countries = [], isLoading, isError } = useCountries()
  const { create, update, remove } = useCountryMutations()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Country | null>(null)
  const [deleting, setDeleting] = useState<Country | null>(null)

  const isMutating = create.isPending || update.isPending || remove.isPending

  const handleSubmit = async (values: EntityFormValues) => {
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
        toast.success("Country updated")
      } else {
        await create.mutateAsync({
          name: values.name,
          code: values.code || undefined,
          isActive: values.isActive,
        })
        toast.success("Country created")
      }
      setFormOpen(false)
      setEditing(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save country")
    }
  }

  const handleToggle = async (item: Country, next: boolean) => {
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
        err instanceof Error ? err.message : "Failed to delete country"
      )
    }
  }

  return (
    <>
      <DemographicsEntityPanel
        title="Countries"
        description="The top level of the address hierarchy — states belong to a country."
        icon={Globe2}
        items={countries}
        isLoading={isLoading}
        isError={isError}
        isMutating={isMutating}
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
        title="Country"
        nameLabel="Country Name"
        namePlaceholder="e.g. Nigeria"
        showCode
        editing={editing}
        onSubmit={handleSubmit}
        isSubmitting={create.isPending || update.isPending}
      />

      <Modal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete country"
        subtitle={
          deleting
            ? `Remove "${deleting.name}"? This fails if it still has states.`
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
    </>
  )
}
