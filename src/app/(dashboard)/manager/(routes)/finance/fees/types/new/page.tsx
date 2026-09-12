"use client"

import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { ArrowLeft, Tags } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PermissionGate } from "@/lib/permissions/PermissionGate"
import { FeeTypeForm } from "@/modules/fee-management/components/admin/fee-type-form"
import type { FeeTypeResponse } from "@/modules/fee-management/types"

export default function NewFeeTypePage() {
  const router = useRouter()

  function handleSuccess(feeType: FeeTypeResponse) {
    router.push(`/manager/finance/fees/types/${feeType.id}`)
  }

  return (
    <PermissionGate
      require={{ resource: "fee-management", action: "manage" }}
      denyBehavior="modal"
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
            onClick={() => router.push("/manager/finance/fees/types")}
            aria-label="Back to fee types"
          >
            <ArrowLeft size={16} />
          </Button>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
              <Tags size={18} className="text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">
                New Fee Type
              </h1>
              <p className="text-sm text-muted-foreground">
                Define the fee structure — scope determines which students are
                billed.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="rounded-2xl border border-border bg-card p-6 shadow-sm"
        >
          <FeeTypeForm
            onSuccess={handleSuccess}
            onCancel={() => router.push("/manager/finance/fees/types")}
          />
        </motion.div>
      </div>
    </PermissionGate>
  )
}
