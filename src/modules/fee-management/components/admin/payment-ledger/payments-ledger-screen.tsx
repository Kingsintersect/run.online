"use client"

import { useMemo, useState } from "react"
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Receipt,
  Search,
  Wallet,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ApiClientError } from "@/lib/clients/apiClient"
import { getErrorMessage } from "@/lib/errors"
import { InvoiceDetailDrawer } from "../invoice-detail-drawer"
import { PaymentLedgerFilters } from "./payment-ledger-filters"
import { PaymentLedgerSummary } from "./payment-ledger-summary"
import { PaymentLedgerTable } from "./payment-ledger-table"
import { PaymentLedgerError } from "./payment-ledger-error"
import { PaymentLedgerDetailDialog } from "./payment-ledger-detail-dialog"
import {
  useDebouncedValue,
  usePaymentLedger,
} from "../../../hooks/use-payment-ledger"
import { useInvoice } from "../../../hooks/use-invoices"
import { usePaymentLedgerUiStore } from "../../../store/payment-ledger-ui.store"
import { downloadCsv, paymentLedgerToCsv } from "../../../lib/payment-ledger"
import type { PaymentLedgerFilters as LedgerQuery } from "../../../types"

const PAGE_SIZES = [20, 50, 100] as const

function LedgerSkeleton() {
  return (
    <div className="space-y-2" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-lg" />
      ))}
    </div>
  )
}

export function PaymentsLedgerScreen() {
  const filters = usePaymentLedgerUiStore((s) => s.filters)
  const page = usePaymentLedgerUiStore((s) => s.page)
  const limit = usePaymentLedgerUiStore((s) => s.limit)
  const setPage = usePaymentLedgerUiStore((s) => s.setPage)
  const setLimit = usePaymentLedgerUiStore((s) => s.setLimit)
  const selectedId = usePaymentLedgerUiStore((s) => s.selectedPaymentId)
  const selectPayment = usePaymentLedgerUiStore((s) => s.selectPayment)

  const search = useDebouncedValue(filters.search.trim(), 400)

  const query: LedgerQuery = useMemo(
    () => ({
      majorProgramId: filters.majorProgramId,
      sessionId: filters.sessionId,
      method: filters.method,
      status: filters.status,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      search: search || undefined,
      page,
      limit,
    }),
    [filters, search, page, limit]
  )

  const { data, isLoading, isFetching, isPlaceholderData, error, refetch } =
    usePaymentLedger(query)
  const rows = useMemo(() => data?.data ?? [], [data])
  const meta = data?.meta

  // ── Invoice drawer: fetch the full invoice, then hand it to the existing
  //    InvoiceDetailDrawer (it needs the whole InvoiceResponse).
  const [invoiceId, setInvoiceId] = useState<number | null>(null)
  const invoiceQuery = useInvoice(invoiceId ?? 0)
  const drawerInvoice =
    invoiceId !== null && invoiceQuery.data?.id === invoiceId
      ? invoiceQuery.data
      : null
  const invoiceError =
    invoiceId !== null && invoiceQuery.error
      ? invoiceQuery.error instanceof ApiClientError &&
        invoiceQuery.error.status === 403
        ? "Your account isn't permitted to open this invoice."
        : getErrorMessage(invoiceQuery.error, "Couldn't load the invoice.")
      : null

  const selected = rows.find((r) => r.id === selectedId) ?? null

  const filtersActive = Object.entries(query).some(
    ([k, v]) => k !== "page" && k !== "limit" && v !== undefined
  )

  function exportCsv() {
    const stamp = new Date().toISOString().slice(0, 10)
    downloadCsv(
      paymentLedgerToCsv(rows),
      `payments-${stamp}-page-${meta?.page ?? page}.csv`
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 dark:bg-primary/20">
            <Wallet size={18} className="text-primary" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Payments</h1>
            <p className="text-sm text-muted-foreground">
              Every payment attempt across students and applicants, within your
              major-program scope.
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={exportCsv}
          disabled={rows.length === 0}
          title="Downloads the rows on this page with the current filters"
        >
          <Download data-icon="inline-start" aria-hidden="true" />
          Export CSV (this page)
        </Button>
      </div>

      <PaymentLedgerFilters />

      {isLoading ? (
        <LedgerSkeleton />
      ) : error && !data ? (
        <PaymentLedgerError error={error} onRetry={() => refetch()} />
      ) : rows.length === 0 ? (
        <div
          role="status"
          className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border py-16 text-muted-foreground"
        >
          {filtersActive ? (
            <Search size={32} className="opacity-30" aria-hidden="true" />
          ) : (
            <Receipt size={32} className="opacity-30" aria-hidden="true" />
          )}
          <p className="text-sm">
            {filtersActive
              ? "No payments match these filters."
              : "No payments have been recorded yet."}
          </p>
        </div>
      ) : (
        <>
          {error && (
            <PaymentLedgerError error={error} onRetry={() => refetch()} />
          )}
          <PaymentLedgerSummary rows={rows} />
          <PaymentLedgerTable
            rows={rows}
            onSelect={selectPayment}
            isFetching={isFetching && isPlaceholderData}
          />

          {meta && (
            <nav
              aria-label="Payments pagination"
              className="flex flex-wrap items-center justify-between gap-3 text-sm"
            >
              <p className="text-muted-foreground" aria-live="polite">
                Page {meta.page} of {Math.max(meta.totalPages, 1)} ·{" "}
                {meta.total.toLocaleString("en-NG")} payment
                {meta.total === 1 ? "" : "s"} in total
              </p>
              <div className="flex items-center gap-2">
                <Select
                  value={String(limit)}
                  onValueChange={(v) => setLimit(Number(v))}
                >
                  <SelectTrigger
                    className="h-8 w-28 rounded-lg text-xs"
                    aria-label="Rows per page"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZES.map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n} / page
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page <= 1 || isFetching}
                  aria-label="Previous page"
                >
                  <ChevronLeft aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page >= meta.totalPages || isFetching}
                  aria-label="Next page"
                >
                  <ChevronRight aria-hidden="true" />
                </Button>
              </div>
            </nav>
          )}
        </>
      )}

      <PaymentLedgerDetailDialog
        payment={drawerInvoice ? null : selected}
        onClose={() => {
          selectPayment(null)
          setInvoiceId(null)
        }}
        onOpenInvoice={setInvoiceId}
        openingInvoice={invoiceId !== null && invoiceQuery.isFetching}
        invoiceError={invoiceError}
      />

      <InvoiceDetailDrawer
        invoice={drawerInvoice}
        onClose={() => {
          setInvoiceId(null)
          selectPayment(null)
        }}
      />
    </div>
  )
}
