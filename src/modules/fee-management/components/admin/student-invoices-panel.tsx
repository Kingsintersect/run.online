"use client"

import { useState } from "react"
import { Loader2, Receipt } from "lucide-react"
import { InvoiceStatusBadge } from "../shared/invoice-status-badge"
import { FeeCategoryBadge } from "../shared/fee-category-badge"
import { CurrencyDisplay } from "../shared/currency-display"
import { InvoiceDetailDrawer } from "./invoice-detail-drawer"
import { useStudentInvoices } from "../../hooks/use-invoices"
import type { FeeCategory, InvoiceResponse } from "../../types"

// Admin — GET /fees/invoices/student/:studentId (fee-management.service.ts).
// Previously unused anywhere in the app (useStudentInvoices had no consumer)
// — there was no way for Admin/Bursary/Dean/Super Admin to see a specific
// student's invoices at all. Opened from StudentList.tsx's "View Invoices"
// action, gated there to callers who already have fee-management:view.
export function StudentInvoicesPanel({ studentId }: { studentId: number }) {
  const { data, isLoading } = useStudentInvoices(studentId)
  const invoices = data?.data ?? []
  const [viewing, setViewing] = useState<InvoiceResponse | null>(null)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10 text-muted-foreground">
        <Loader2 size={18} className="animate-spin" />
      </div>
    )
  }

  if (invoices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
        <Receipt size={28} className="opacity-30" />
        <p className="text-sm">No invoices for this student yet.</p>
      </div>
    )
  }

  return (
    <>
      <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
        {invoices.map((inv) => {
          const balance = Math.max(
            0,
            Number(inv.amount) - Number(inv.amountPaid)
          )
          return (
            <button
              key={inv.id}
              type="button"
              onClick={() => setViewing(inv)}
              className="flex w-full items-center justify-between gap-3 rounded-xl border border-border p-3 text-left transition-colors hover:border-primary/30 hover:bg-muted/40"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {inv.feeType.name}
                </p>
                <div className="mt-1 flex items-center gap-1.5">
                  <FeeCategoryBadge
                    category={inv.feeType.category as FeeCategory}
                  />
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {inv.invoiceNumber}
                  </span>
                </div>
              </div>
              <div className="shrink-0 space-y-1 text-right">
                <InvoiceStatusBadge status={inv.status} />
                <p className="text-xs text-muted-foreground">
                  <CurrencyDisplay amount={balance} /> due
                </p>
              </div>
            </button>
          )
        })}
      </div>

      <InvoiceDetailDrawer invoice={viewing} onClose={() => setViewing(null)} />
    </>
  )
}
