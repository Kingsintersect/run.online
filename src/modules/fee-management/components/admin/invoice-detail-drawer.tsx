"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  AlertTriangle,
  ArrowRight,
  Ban,
  BadgeCheck,
  Calendar,
  Hash,
  ListChecks,
  Loader2,
  Receipt,
  ShieldOff,
  Tag,
  User,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { PermissionGate } from "@/lib/permissions/PermissionGate"
import { InvoiceStatusBadge } from "../shared/invoice-status-badge"
import { FeeCategoryBadge } from "../shared/fee-category-badge"
import { CurrencyDisplay } from "../shared/currency-display"
import { PaymentHistory } from "../shared/payment-history"
import { WaiveInvoiceDialog } from "./waive-invoice-dialog"
import { useCancelInvoice } from "../../hooks/use-fee-mutations"
import { getInvoiceWaiver } from "../../lib/invoice-waiver"
import { StandingSummaryCompact } from "@/modules/progression/components/standing-summary-compact"
import type { InvoiceResponse, FeeCategory } from "../../types"

interface InvoiceDetailDrawerProps {
  invoice: InvoiceResponse | null
  onClose: () => void
}

export function InvoiceDetailDrawer({
  invoice,
  onClose,
}: InvoiceDetailDrawerProps) {
  const [waiveOpen, setWaiveOpen] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const cancel = useCancelInvoice()

  const canActOn =
    invoice &&
    invoice.status !== "PAID" &&
    invoice.status !== "WAIVED" &&
    invoice.status !== "CANCELLED"

  const balance = invoice
    ? Math.max(0, Number(invoice.amount) - Number(invoice.amountPaid))
    : 0

  const waiver = invoice ? getInvoiceWaiver(invoice) : null

  return (
    <>
      <AnimatePresence>
        {invoice && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
              onClick={onClose}
            />

            {/* Drawer */}
            <motion.aside
              key="drawer"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 340, damping: 30 }}
              className="fixed top-0 right-0 z-50 flex h-full w-full max-w-md flex-col border-l border-border bg-card shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div className="flex items-center gap-2">
                  <Receipt size={16} className="text-primary" />
                  <h2 className="text-sm font-semibold text-foreground">
                    Invoice Detail
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  aria-label="Close drawer"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
                {/* Invoice number + status */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs text-muted-foreground">
                      {invoice.invoiceNumber}
                    </p>
                    <p className="mt-0.5 font-semibold text-foreground">
                      {invoice.feeType.name}
                    </p>
                  </div>
                  <InvoiceStatusBadge status={invoice.status} />
                </div>

                {/* Amount summary */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">Total</p>
                    <CurrencyDisplay
                      amount={invoice.amount}
                      className="mt-0.5 block text-sm font-semibold text-foreground"
                    />
                  </div>
                  <div className="rounded-xl bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">Paid</p>
                    <CurrencyDisplay
                      amount={invoice.amountPaid}
                      className="mt-0.5 block text-sm font-semibold text-green-600 dark:text-green-400"
                    />
                  </div>
                  <div className="rounded-xl bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">Balance</p>
                    <CurrencyDisplay
                      amount={balance}
                      className={
                        "mt-0.5 block text-sm font-semibold " +
                        (balance > 0
                          ? "text-destructive"
                          : "text-muted-foreground")
                      }
                    />
                  </div>
                </div>

                <Separator />

                {/* Metadata rows */}
                <dl className="space-y-3 text-sm">
                  {invoice.student && (
                    <div className="flex items-start gap-3">
                      <User
                        size={14}
                        className="mt-0.5 shrink-0 text-muted-foreground"
                      />
                      <div>
                        <dt className="text-xs text-muted-foreground">
                          Student
                        </dt>
                        <dd className="font-medium text-foreground">
                          {invoice.student.fullName}
                        </dd>
                        <dd className="font-mono text-xs text-muted-foreground">
                          {invoice.student.matricNumber}
                        </dd>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-3">
                    <Tag
                      size={14}
                      className="mt-0.5 shrink-0 text-muted-foreground"
                    />
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        Category
                      </dt>
                      <dd className="mt-0.5">
                        <FeeCategoryBadge
                          category={invoice.feeType.category as FeeCategory}
                        />
                      </dd>
                    </div>
                  </div>

                  {invoice.session && (
                    <div className="flex items-start gap-3">
                      <Hash
                        size={14}
                        className="mt-0.5 shrink-0 text-muted-foreground"
                      />
                      <div>
                        <dt className="text-xs text-muted-foreground">
                          Session
                        </dt>
                        <dd className="font-medium">{invoice.session.name}</dd>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-3">
                    <Calendar
                      size={14}
                      className="mt-0.5 shrink-0 text-muted-foreground"
                    />
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        Due Date
                      </dt>
                      <dd className="font-medium">
                        {new Date(invoice.dueDate).toLocaleDateString("en-NG", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        })}
                      </dd>
                    </div>
                  </div>
                </dl>

                {/* Read-only academic standing (standings.view) — BURSARY's
                    only view of a student is this drawer. */}
                {invoice.student && (
                  <StandingSummaryCompact studentId={invoice.student.id} />
                )}

                {/* Waiver record — who, when and why (screen 7). */}
                {waiver && (
                  <section
                    aria-labelledby="invoice-waiver-heading"
                    className="rounded-lg border border-teal-200 bg-teal-50 p-3 text-sm dark:border-teal-900/40 dark:bg-teal-900/10"
                  >
                    <h3
                      id="invoice-waiver-heading"
                      className="flex items-center gap-1.5 text-xs font-semibold text-teal-800 dark:text-teal-300"
                    >
                      <BadgeCheck size={13} aria-hidden="true" />
                      Waived
                    </h3>
                    {waiver.by || waiver.at || waiver.reason ? (
                      <dl className="mt-2 space-y-1.5 text-xs">
                        <div className="flex gap-2">
                          <dt className="w-16 shrink-0 text-muted-foreground">
                            By
                          </dt>
                          <dd className="font-medium text-foreground">
                            {waiver.by ?? "Not recorded"}
                          </dd>
                        </div>
                        <div className="flex gap-2">
                          <dt className="w-16 shrink-0 text-muted-foreground">
                            On
                          </dt>
                          <dd className="font-medium text-foreground">
                            {waiver.at
                              ? new Date(waiver.at).toLocaleString("en-NG", {
                                  day: "2-digit",
                                  month: "long",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "Not recorded"}
                          </dd>
                        </div>
                        <div className="flex gap-2">
                          <dt className="w-16 shrink-0 text-muted-foreground">
                            Reason
                          </dt>
                          <dd className="whitespace-pre-wrap text-foreground">
                            {waiver.reason ?? "Not recorded"}
                          </dd>
                        </div>
                      </dl>
                    ) : (
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        The server didn&apos;t return who waived this invoice,
                        when, or why.
                      </p>
                    )}
                  </section>
                )}

                {/* Overdue warning */}
                {invoice.status === "OVERDUE" && (
                  <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-destructive dark:border-red-900/40 dark:bg-red-900/10">
                    <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                    This invoice is overdue. The student is past their payment
                    deadline.
                  </div>
                )}

                <Separator />

                {/* Payment log — the admin side had no way to see an
                    invoice's payment/transaction history at all before this;
                    reuses the same component the student self-service page
                    already uses (moved to components/shared/ for this). */}
                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <ListChecks size={14} className="text-muted-foreground" />
                    <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                      Payment Log
                    </h3>
                  </div>
                  <PaymentHistory
                    invoiceId={invoice.id}
                    invoiceNumber={invoice.invoiceNumber}
                    feeTypeName={invoice.feeType.name}
                  />
                </div>
              </div>

              {/* Footer — admin actions */}
              <div className="space-y-3 border-t border-border px-5 py-4">
                {canActOn && (
                  <>
                    {/* Waive. The contract names the permission
                        invoices.waive; live sessions carry the older
                        fee-management.waive, which the backend prompt says
                        to reuse. Either one grants it. */}
                    <PermissionGate
                      require={[
                        { resource: "invoices", action: "waive" },
                        { resource: "fee-management", action: "waive" },
                      ]}
                      mode="any"
                      fallback={
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <ShieldOff size={12} aria-hidden="true" />
                          You don&apos;t have permission to waive invoices.
                        </div>
                      }
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-1.5"
                        onClick={() => setWaiveOpen(true)}
                      >
                        <ArrowRight size={13} aria-hidden="true" />
                        Waive invoice
                      </Button>
                    </PermissionGate>

                    {/* Cancel — requires manage */}
                    <PermissionGate
                      require={{ resource: "fee-management", action: "manage" }}
                    >
                      {confirmCancel ? (
                        <div className="flex gap-2">
                          <Button
                            variant="destructive"
                            size="sm"
                            className="flex-1 text-xs"
                            disabled={cancel.isPending}
                            onClick={() => {
                              cancel.mutate(invoice.id, {
                                onSuccess: () => {
                                  setConfirmCancel(false)
                                  onClose()
                                },
                              })
                            }}
                          >
                            {cancel.isPending && (
                              <Loader2
                                size={12}
                                className="mr-1 animate-spin"
                              />
                            )}
                            Confirm Cancel
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="flex-1 text-xs"
                            onClick={() => setConfirmCancel(false)}
                          >
                            Keep Invoice
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full gap-1.5 text-xs text-destructive hover:text-destructive"
                          onClick={() => setConfirmCancel(true)}
                        >
                          <Ban size={13} />
                          Cancel Invoice
                        </Button>
                      )}
                    </PermissionGate>
                  </>
                )}

                {!canActOn && (
                  <p className="py-1 text-center text-xs text-muted-foreground">
                    No actions available — invoice is{" "}
                    {invoice.status.toLowerCase()}.
                  </p>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Waive dialog — rendered outside drawer so z-index stacks correctly */}
      {invoice && (
        <WaiveInvoiceDialog
          invoice={invoice}
          open={waiveOpen}
          onClose={() => setWaiveOpen(false)}
          // The drawer holds a snapshot of the invoice; close it so the
          // refetched list (now WAIVED) is what the admin sees next.
          onWaived={onClose}
        />
      )}
    </>
  )
}
