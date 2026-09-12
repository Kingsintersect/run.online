"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { ClipboardCheck, Pencil, Plus, Power } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import EmptyState from "@/components/custom/EmptyState"
import { useClearanceTypes } from "../../hooks/use-clearance"
import { useDeactivateClearanceType } from "../../hooks/use-clearance-mutations"
import { ClearanceTypeFormDialog } from "./clearance-type-form-dialog"
import type { ClearanceType } from "../../types"

export function ClearanceTypesManager() {
  const { data: types = [], isLoading } = useClearanceTypes()
  const deactivate = useDeactivateClearanceType()
  const [editing, setEditing] = useState<ClearanceType | null | undefined>(
    undefined
  )

  const handleDeactivate = async (id: number) => {
    try {
      await deactivate.mutateAsync(id)
      toast.success("Clearance type deactivated")
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to deactivate clearance type"
      )
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-muted/40" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Clearance Types
          </h2>
          <p className="text-sm text-muted-foreground">
            Define the checkpoints students must clear (e.g., Library, Bursary,
            Department).
          </p>
        </div>
        <Button onClick={() => setEditing(null)}>
          <Plus className="size-4" data-icon="inline-start" />
          New Type
        </Button>
      </div>

      {types.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="No clearance types yet"
          description="Create your first clearance checkpoint to get started."
          action={
            <Button onClick={() => setEditing(null)}>
              <Plus className="size-4" data-icon="inline-start" />
              Create First Type
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {types.map((type, index) => (
            <motion.div
              key={type.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <Card>
                <CardContent className="pt-6">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <ClipboardCheck size={16} />
                      </div>
                      <p className="text-sm font-semibold text-foreground">
                        {type.name}
                      </p>
                    </div>
                    {type.isActive === false && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        Inactive
                      </span>
                    )}
                  </div>
                  {type.description && (
                    <p className="mb-3 line-clamp-2 text-xs text-muted-foreground">
                      {type.description}
                    </p>
                  )}
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() => setEditing(type)}
                    >
                      <Pencil className="size-3.5" data-icon="inline-start" />
                      Edit
                    </Button>
                    {type.isActive !== false && (
                      <Button
                        variant="outline"
                        size="icon-sm"
                        title="Deactivate"
                        disabled={deactivate.isPending}
                        onClick={() => handleDeactivate(type.id)}
                      >
                        <Power className="size-3.5 text-destructive" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <ClearanceTypeFormDialog
        open={editing !== undefined}
        onClose={() => setEditing(undefined)}
        clearanceType={editing}
      />
    </div>
  )
}
