"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { FileText } from "lucide-react"
import { PermissionGate } from "@/lib/permissions/PermissionGate"
import { InvoiceAdminTable } from "@/modules/fee-management/components/admin/invoice-admin-table"
import { InvoiceDetailDrawer } from "@/modules/fee-management/components/admin/invoice-detail-drawer"
import type { InvoiceResponse } from "@/modules/fee-management/types"

export default function ManagerInvoicesPage() {
  const [selectedInvoice, setSelectedInvoice] =
    useState<InvoiceResponse | null>(null)

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
          className="flex items-center gap-3"
        >
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
            <FileText size={18} className="text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Invoices</h1>
            <p className="text-sm text-muted-foreground">
              View, filter, waive, or cancel student invoices.
            </p>
          </div>
        </motion.div>

        {/* Table */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
        >
          <InvoiceAdminTable onViewDetail={setSelectedInvoice} />
        </motion.div>
      </div>

      {/* Detail drawer — slide-in from right */}
      <InvoiceDetailDrawer
        invoice={selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
      />
    </PermissionGate>
  )
}
