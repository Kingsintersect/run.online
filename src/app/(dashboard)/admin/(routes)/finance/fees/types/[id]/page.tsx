"use client"

import { use } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { ArrowLeft, ShieldOff, Tags } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { PermissionGate } from "@/lib/permissions/PermissionGate"
import { FeeTypeForm } from "@/modules/fee-management/components/admin/fee-type-form"
import { GenerationStatusPanel } from "@/modules/fee-management/components/admin/generation-status-panel"
import { FeeCategoryBadge } from "@/modules/fee-management/components/shared/fee-category-badge"
import { useFeeType } from "@/modules/fee-management/hooks/use-fee-types"
import { useActivateFeeType } from "@/modules/fee-management/hooks/use-fee-mutations"
import type { FeeTypeResponse } from "@/modules/fee-management/types"

interface Props {
  params: Promise<{ id: string }>
}

export default function EditFeeTypePage({ params }: Props) {
  const { id } = use(params)
  const feeTypeId = Number(id)
  const router = useRouter()

  const { data: feeType, isLoading } = useFeeType(feeTypeId)
  const activate = useActivateFeeType()

  function handleSuccess(_updated: FeeTypeResponse) {
    router.push("/admin/finance/fees/types")
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-120 w-full rounded-2xl" />
      </div>
    )
  }

  if (!feeType) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-muted-foreground">
        <ShieldOff size={40} className="opacity-40" />
        <p className="text-sm">Fee type not found.</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/admin/finance/fees/types")}
        >
          Back to list
        </Button>
      </div>
    )
  }

  return (
    <PermissionGate
      require={{ resource: "fee-management", action: "view" }}
      denyBehavior="screen"
    >
      <div className="mx-auto max-w-2xl space-y-6 p-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3"
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/admin/finance/fees/types")}
            aria-label="Back to fee types"
          >
            <ArrowLeft size={16} />
          </Button>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
              <Tags size={18} className="text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold text-foreground">
                  {feeType.name}
                </h1>
                <FeeCategoryBadge category={feeType.category} />
              </div>
              <p className="text-sm text-muted-foreground">
                Edit details · Amount changes take effect immediately.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Generation status — always visible for active fee types */}
        {feeType.isActive && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="mb-2 text-sm font-medium text-foreground">
              Invoice Generation
            </p>
            <GenerationStatusPanel
              feeTypeId={feeTypeId}
              onRetry={() => activate.mutate(feeTypeId)}
            />
          </motion.div>
        )}

        {/* Edit form */}
        <PermissionGate
          require={{ resource: "fee-management", action: "manage" }}
        >
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="rounded-2xl border border-border bg-card p-6 shadow-sm"
          >
            <FeeTypeForm
              defaultValues={feeType}
              onSuccess={handleSuccess}
              onCancel={() => router.push("/admin/finance/fees/types")}
            />
          </motion.div>
        </PermissionGate>
      </div>
    </PermissionGate>
  )
}
