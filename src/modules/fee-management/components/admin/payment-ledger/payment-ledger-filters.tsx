"use client"

import { useMemo } from "react"
import { RotateCcw, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useMajorPrograms } from "@/hooks/useCourseStructure"
import { useMajorProgramScope } from "@/hooks/use-major-program-scope"
import { useSessionOptions } from "@/hooks/use-session-options"
import {
  PaymentStatusSchema,
  RecordedPaymentMethodSchema,
} from "../../../schemas/common.schema"
import {
  PAYMENT_METHOD_LABEL,
  PAYMENT_STATUS_LABEL,
  PAYMENT_STATUSES,
} from "../../../lib/payment-ledger"
import { usePaymentLedgerUiStore } from "../../../store/payment-ledger-ui.store"

const ALL = "_ALL_"
const TRIGGER =
  "h-9 w-full rounded-xl border-transparent bg-muted text-sm dark:bg-muted/60"

const toNumber = (v: string): number | undefined =>
  v === ALL ? undefined : Number(v)

export function PaymentLedgerFilters() {
  const filters = usePaymentLedgerUiStore((s) => s.filters)
  const setFilters = usePaymentLedgerUiStore((s) => s.setFilters)
  const resetFilters = usePaymentLedgerUiStore((s) => s.resetFilters)

  const { data: majorProgramsRes } = useMajorPrograms()
  const { withinScope } = useMajorProgramScope()
  // UI convenience only — the server still confines every caller.
  const majorPrograms = useMemo(
    () => (majorProgramsRes?.data ?? []).filter((mp) => withinScope(mp.id)),
    [majorProgramsRes, withinScope]
  )
  const { options: sessionOptions } = useSessionOptions({
    majorProgramId: filters.majorProgramId ?? null,
  })

  const hasFilters =
    filters.majorProgramId !== undefined ||
    filters.sessionId !== undefined ||
    filters.method !== undefined ||
    filters.status !== undefined ||
    !!filters.dateFrom ||
    !!filters.dateTo ||
    filters.search.trim() !== ""

  return (
    <div
      role="search"
      aria-label="Filter payments"
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
    >
      <div className="relative sm:col-span-2">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          value={filters.search}
          onChange={(e) => setFilters({ search: e.target.value })}
          placeholder="Payment reference or matric number"
          aria-label="Search by payment reference or matric number"
          className="h-9 rounded-xl pl-9"
        />
      </div>

      {majorPrograms.length > 1 && (
        <Select
          value={filters.majorProgramId?.toString() ?? ALL}
          onValueChange={(v) =>
            // A session belongs to one major program, so changing the
            // program clears the session to avoid an impossible pair.
            setFilters({ majorProgramId: toNumber(v), sessionId: undefined })
          }
        >
          <SelectTrigger className={TRIGGER} aria-label="Major program">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All major programs</SelectItem>
            {majorPrograms.map((mp) => (
              <SelectItem key={mp.id} value={mp.id.toString()}>
                {mp.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Select
        value={filters.sessionId?.toString() ?? ALL}
        onValueChange={(v) => setFilters({ sessionId: toNumber(v) })}
      >
        <SelectTrigger className={TRIGGER} aria-label="Academic session">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All sessions</SelectItem>
          {sessionOptions.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.method ?? ALL}
        onValueChange={(v) =>
          setFilters({ method: RecordedPaymentMethodSchema.safeParse(v).data })
        }
      >
        <SelectTrigger className={TRIGGER} aria-label="Payment method">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All methods</SelectItem>
          {RecordedPaymentMethodSchema.options.map((m) => (
            <SelectItem key={m} value={m}>
              {PAYMENT_METHOD_LABEL[m]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.status ?? ALL}
        onValueChange={(v) =>
          setFilters({ status: PaymentStatusSchema.safeParse(v).data })
        }
      >
        <SelectTrigger className={TRIGGER} aria-label="Payment status">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All statuses</SelectItem>
          {PAYMENT_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {PAYMENT_STATUS_LABEL[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="shrink-0">From</span>
        <Input
          type="date"
          value={filters.dateFrom ?? ""}
          max={filters.dateTo || undefined}
          onChange={(e) =>
            setFilters({ dateFrom: e.target.value || undefined })
          }
          aria-label="Paid on or after"
          className="h-9 rounded-xl"
        />
      </label>

      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="shrink-0">To</span>
        <Input
          type="date"
          value={filters.dateTo ?? ""}
          min={filters.dateFrom || undefined}
          onChange={(e) => setFilters({ dateTo: e.target.value || undefined })}
          aria-label="Paid on or before"
          className="h-9 rounded-xl"
        />
      </label>

      {hasFilters && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={resetFilters}
          className="h-9 justify-self-start"
        >
          <RotateCcw data-icon="inline-start" aria-hidden="true" />
          Clear filters
        </Button>
      )}
    </div>
  )
}
