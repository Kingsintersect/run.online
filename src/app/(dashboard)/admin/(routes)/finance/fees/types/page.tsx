"use client"

import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Plus, Tags } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PermissionGate } from "@/lib/permissions/PermissionGate"
import { FeeTypeTable } from "@/modules/fee-management/components/admin/fee-type-table"
import { GenerationStatusPanel } from "@/modules/fee-management/components/admin/generation-status-panel"
import { useFeeManagementUiStore } from "@/modules/fee-management/store/fee-management-ui.store"
import { useActivateFeeType } from "@/modules/fee-management/hooks/use-fee-mutations"
import type { FeeTypeResponse } from "@/modules/fee-management/types"

export default function AdminFeeTypesPage() {
  const router = useRouter()
  const { generationStatusFeeTypeId, setGenerationStatusFeeTypeId } =
    useFeeManagementUiStore()
  const activate = useActivateFeeType()

  function handleEdit(feeType: FeeTypeResponse) {
    router.push(`/admin/finance/fees/types/${feeType.id}`)
  }

  function handleViewGeneration(feeTypeId: number) {
    setGenerationStatusFeeTypeId(feeTypeId)
  }

  return (
    <PermissionGate
      require={{ resource: "fee-management", action: "view" }}
      denyBehavior="screen"
    >
      <div className="space-y-6 p-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-start justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
              <Tags size={18} className="text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">
                Fee Types
              </h1>
              <p className="text-sm text-muted-foreground">
                Define and manage fee structures, then activate to generate
                invoices.
              </p>
            </div>
          </div>
          <PermissionGate
            require={{ resource: "fee-management", action: "manage" }}
          >
            <Button
              onClick={() => router.push("/admin/finance/fees/types/new")}
              className="gap-1.5"
            >
              <Plus size={14} data-icon="inline-start" />
              New Fee Type
            </Button>
          </PermissionGate>
        </motion.div>

        {/* Generation status panel — shown after activation */}
        {generationStatusFeeTypeId && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">
                Invoice Generation Status
              </p>
              <button
                type="button"
                onClick={() => setGenerationStatusFeeTypeId(null)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Dismiss
              </button>
            </div>
            <GenerationStatusPanel
              feeTypeId={generationStatusFeeTypeId}
              onRetry={() => activate.mutate(generationStatusFeeTypeId)}
            />
          </motion.div>
        )}

        {/* Fee type table */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
        >
          <FeeTypeTable
            onEdit={handleEdit}
            onViewGeneration={handleViewGeneration}
          />
        </motion.div>
      </div>
    </PermissionGate>
  )
}
