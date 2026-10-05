"use client"

import { useState } from "react"
import { ArrowRight, History } from "lucide-react"
import EmptyState from "@/components/custom/EmptyState"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useMajorPrograms } from "@/hooks/useCourseStructure"
import { cn } from "@/lib/utils"
import {
  useGatewayAssignmentHistory,
  useGatewayProviders,
  usePaymentGateways,
} from "../hooks/use-payment-gateways"
import { formatDateTime, gatewayLabel } from "../lib/gateway-eligibility"
import { ErrorState, FallbackNotice, TableSkeleton } from "./panel-states"

const ALL = "all"
const th =
  "px-3 py-2.5 text-left text-[11px] font-semibold tracking-wide text-muted-foreground uppercase"
const td = "px-3 py-3 align-top text-sm"

export function AssignmentHistoryPanel() {
  const [programFilter, setProgramFilter] = useState<string>(ALL)
  const majorProgramId = programFilter === ALL ? null : Number(programFilter)
  const { history, source, isLoading, isError, error, refetch } =
    useGatewayAssignmentHistory(majorProgramId)
  const { gateways } = usePaymentGateways()
  const { providers } = useGatewayProviders()
  const { data: programsRes } = useMajorPrograms()
  const programs = programsRes?.data ?? []

  const programName = (id: number | null) =>
    id === null
      ? "Institution default"
      : (programs.find((p) => p.id === id)?.name ?? `Program #${id}`)
  const gatewayName = (id: number | null) =>
    gatewayLabel(gateways, providers, id) ?? "Default"

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Every gateway switch, manual or automatic, with its reason.
        </p>
        <div className="space-y-1">
          <Label htmlFor="history-program-filter" className="text-xs">
            Major program
          </Label>
          <Select value={programFilter} onValueChange={setProgramFilter}>
            <SelectTrigger id="history-program-filter" className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All programs</SelectItem>
              {programs.map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : isError ? (
        <ErrorState
          title="Couldn't load the routing history"
          error={error}
          onRetry={refetch}
        />
      ) : source === "fallback" ? (
        <>
          <FallbackNotice>
            Routing history starts once the server records gateway switches
            (sandbox/payment-routing). Nothing has been recorded yet.
          </FallbackNotice>
          <EmptyState
            icon={History}
            title="No routing history yet"
            description="Switches made after the backend ships per-program routing will appear here."
          />
        </>
      ) : history.length === 0 ? (
        <EmptyState
          icon={History}
          title="No switches recorded"
          description={
            majorProgramId === null
              ? "No gateway has been switched yet."
              : "This major program's gateway hasn't been switched yet."
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[720px] border-collapse">
            <caption className="sr-only">Gateway switch history</caption>
            <thead className="border-b border-border bg-muted/40">
              <tr>
                <th scope="col" className={th}>
                  When
                </th>
                <th scope="col" className={th}>
                  Major program
                </th>
                <th scope="col" className={th}>
                  Change
                </th>
                <th scope="col" className={th}>
                  Trigger
                </th>
                <th scope="col" className={th}>
                  Reason
                </th>
                <th scope="col" className={th}>
                  By
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {history.map((h) => (
                <tr key={h.id}>
                  <td
                    className={cn(
                      td,
                      "text-xs whitespace-nowrap text-muted-foreground"
                    )}
                  >
                    {formatDateTime(h.changedAt)}
                  </td>
                  <td className={cn(td, "font-medium text-foreground")}>
                    {programName(h.majorProgramId)}
                  </td>
                  <td className={td}>
                    <span className="inline-flex flex-wrap items-center gap-1.5">
                      <span className="text-muted-foreground">
                        {gatewayName(h.fromGatewayId)}
                      </span>
                      <ArrowRight
                        className="size-3.5 text-muted-foreground"
                        aria-label="to"
                      />
                      <span className="font-medium text-foreground">
                        {gatewayName(h.toGatewayId)}
                      </span>
                    </span>
                  </td>
                  <td className={td}>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap",
                        h.trigger === "AUTO_FAILOVER"
                          ? "bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {h.trigger === "AUTO_FAILOVER"
                        ? "Auto-failover"
                        : "Manual"}
                    </span>
                  </td>
                  <td className={cn(td, "max-w-xs text-muted-foreground")}>
                    {h.reason ?? "—"}
                  </td>
                  <td className={cn(td, "text-xs text-muted-foreground")}>
                    {/* changedBy is always null for AUTO_FAILOVER
                        (GatewayHealthCheckJob, no human involved). */}
                    {h.changedBy?.name ??
                      (h.trigger === "AUTO_FAILOVER"
                        ? "Automatic (health check)"
                        : "Unknown")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
