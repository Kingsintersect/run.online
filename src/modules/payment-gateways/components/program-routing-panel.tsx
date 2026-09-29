"use client"

import { useState } from "react"
import { GitBranch, Pencil, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import EmptyState from "@/components/custom/EmptyState"
import { cn } from "@/lib/utils"
import {
  useGatewayAssignments,
  useGatewayProviders,
  usePaymentGateways,
} from "../hooks/use-payment-gateways"
import { formatDateTime, gatewayLabel } from "../lib/gateway-eligibility"
import type { GatewayAssignment } from "../types"
import { AssignmentDialog, type AssignmentTarget } from "./assignment-dialog"
import { ErrorState, FallbackNotice, TableSkeleton } from "./panel-states"

const th =
  "px-3 py-2.5 text-left text-[11px] font-semibold tracking-wide text-muted-foreground uppercase"
const td = "px-3 py-3 align-top text-sm"

export function ProgramRoutingPanel() {
  const routing = useGatewayAssignments()
  const { gateways } = usePaymentGateways()
  const { providers } = useGatewayProviders()
  const [target, setTarget] = useState<AssignmentTarget | null>(null)

  const isFallback = routing.source === "fallback"
  const name = (id: number | null) => gatewayLabel(gateways, providers, id)
  const defaultName = name(routing.defaultGatewayId) ?? "Server default"
  const noteId = "routing-fallback-note"

  const effective = (a: GatewayAssignment) => {
    if (isFallback) return { text: "Server default", failover: false }
    const failover =
      a.effectiveGatewayId !== null &&
      a.effectiveGatewayId !== a.gatewayId &&
      a.effectiveGatewayId === a.fallbackGatewayId
    const text =
      name(a.effectiveGatewayId) ??
      (a.gatewayId === null ? `${defaultName} (default)` : "None")
    return { text, failover }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Which gateway each major program&apos;s new payments go through. A
        switch affects new payments only.
      </p>

      {isFallback && !routing.isLoading && !routing.isError && (
        <FallbackNotice>
          <span id={noteId}>
            Per-program routing isn&apos;t on the server yet: every program pays
            through the server&apos;s built-in gateway choice. Routing controls
            unlock when the backend ships the proposal in
            sandbox/payment-routing.
          </span>
        </FallbackNotice>
      )}

      {routing.isLoading ? (
        <TableSkeleton />
      ) : routing.isError ? (
        <ErrorState
          title="Couldn't load program routing"
          error={routing.error}
          onRetry={routing.refetch}
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[760px] border-collapse">
            <caption className="sr-only">
              Payment gateway per major program
            </caption>
            <thead className="border-b border-border bg-muted/40">
              <tr>
                <th scope="col" className={th}>
                  Major program
                </th>
                <th scope="col" className={th}>
                  Gateway
                </th>
                <th scope="col" className={th}>
                  Fallback
                </th>
                <th scope="col" className={th}>
                  Auto-failover
                </th>
                <th scope="col" className={th}>
                  Effective now
                </th>
                <th scope="col" className={th}>
                  Updated
                </th>
                <th scope="col" className={cn(th, "text-right")}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {/* Institution default */}
              <tr className="bg-primary/3">
                <th
                  scope="row"
                  className={cn(td, "text-left font-semibold text-foreground")}
                >
                  Institution default
                  <p className="text-xs font-normal text-muted-foreground">
                    Programs without their own gateway
                  </p>
                </th>
                <td className={td}>
                  {isFallback ? "Server default" : defaultName}
                </td>
                <td className={cn(td, "text-muted-foreground")}>—</td>
                <td className={cn(td, "text-muted-foreground")}>—</td>
                <td className={td}>
                  {isFallback ? "Server default" : defaultName}
                </td>
                <td className={cn(td, "text-muted-foreground")}>—</td>
                <td className={cn(td, "text-right")}>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isFallback}
                    aria-describedby={isFallback ? noteId : undefined}
                    aria-label="Change institution default gateway"
                    onClick={() =>
                      setTarget({
                        kind: "default",
                        defaultGatewayId: routing.defaultGatewayId,
                      })
                    }
                  >
                    <Pencil data-icon="inline-start" aria-hidden="true" />
                    Change
                  </Button>
                </td>
              </tr>

              {routing.assignments.map((a) => {
                const eff = effective(a)
                return (
                  <tr key={a.majorProgramId}>
                    <th
                      scope="row"
                      className={cn(
                        td,
                        "text-left font-medium text-foreground"
                      )}
                    >
                      {a.majorProgramName}
                    </th>
                    <td className={td}>
                      {isFallback
                        ? "Server default"
                        : (name(a.gatewayId) ?? (
                            <span className="text-muted-foreground">
                              Institution default
                            </span>
                          ))}
                    </td>
                    <td className={td}>
                      {name(a.fallbackGatewayId) ?? (
                        <span className="text-muted-foreground">None</span>
                      )}
                    </td>
                    <td className={td}>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                          a.autoFailover
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {a.autoFailover ? "On" : "Off"}
                      </span>
                    </td>
                    <td className={td}>
                      <span
                        className={cn(
                          eff.failover &&
                            "inline-flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 font-semibold text-amber-800 dark:bg-amber-950/50 dark:text-amber-200"
                        )}
                      >
                        {eff.failover && (
                          <Zap className="size-3" aria-hidden="true" />
                        )}
                        {eff.text}
                      </span>
                      {eff.failover && (
                        <p className="mt-0.5 text-[11px] text-amber-700 dark:text-amber-300">
                          Failover active: primary is failing
                        </p>
                      )}
                    </td>
                    <td className={cn(td, "text-xs text-muted-foreground")}>
                      {a.updatedAt ? (
                        <>
                          {formatDateTime(a.updatedAt)}
                          {a.updatedBy && <p>by {a.updatedBy.name}</p>}
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className={cn(td, "text-right")}>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isFallback}
                        aria-describedby={isFallback ? noteId : undefined}
                        aria-label={`Change gateway for ${a.majorProgramName}`}
                        onClick={() =>
                          setTarget({ kind: "program", assignment: a })
                        }
                      >
                        <Pencil data-icon="inline-start" aria-hidden="true" />
                        Change
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {routing.assignments.length === 0 && (
            <EmptyState
              icon={GitBranch}
              title="No major programs"
              description="Create major programs first; each one can then have its own gateway."
              className="py-10"
            />
          )}
        </div>
      )}

      <AssignmentDialog
        target={target}
        onOpenChange={(open) => !open && setTarget(null)}
        gateways={gateways}
        providers={providers}
      />
    </div>
  )
}
