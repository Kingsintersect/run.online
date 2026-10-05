"use client"

import { AlertTriangle, X } from "lucide-react"
import { useMajorPrograms } from "@/hooks/useCourseStructure"
import { cn } from "@/lib/utils"
import type { GatewayInUseDetails } from "../types"

interface GatewayErrorAlertProps {
  message: string
  /** Further messages, listed under `message`. */
  items?: string[]
  /** 409 GATEWAY_IN_USE details; listed under the message when present. */
  inUse?: GatewayInUseDetails | null
  /** What the user tried: "disable" or "delete". */
  action?: "disable" | "delete"
  onDismiss?: () => void
  className?: string
}

/**
 * An inline error next to the control that caused it. With `inUse`, lists
 * which major programs use the gateway (ids resolved through the major
 * programs list), whether it is the institution default, and its pending
 * payments, then says to reassign first.
 */
export function GatewayErrorAlert({
  message,
  items,
  inUse,
  action,
  onDismiss,
  className,
}: GatewayErrorAlertProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200",
        className
      )}
    >
      <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <p>{message}</p>
        {items && items.length > 0 && (
          <ul className="list-disc space-y-0.5 pl-4">
            {items.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        )}
        {inUse && <InUseDetails details={inUse} action={action ?? "delete"} />}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="-m-1 h-fit rounded p-1 text-red-700 hover:bg-red-100 focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:outline-none dark:text-red-300 dark:hover:bg-red-900/40"
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}

function InUseDetails({
  details,
  action,
}: {
  details: GatewayInUseDetails
  action: "disable" | "delete"
}) {
  const { data: programsRes } = useMajorPrograms()
  const names = new Map(
    (programsRes?.data ?? []).map((mp) => [mp.id, mp.name] as const)
  )
  const programs = details.majorProgramIds.map(
    (id) => names.get(id) ?? `Program #${id}`
  )
  const { isDefault, pendingPayments } = details
  const nothingListed =
    programs.length === 0 && !isDefault && pendingPayments === 0

  return (
    <>
      <ul className="list-disc space-y-0.5 pl-4">
        {programs.length > 0 && (
          <li>
            Routed to it (primary or fallback):{" "}
            <span className="font-medium">{programs.join(", ")}</span>
          </li>
        )}
        {isDefault && <li>It&apos;s the institution default gateway.</li>}
        {pendingPayments > 0 && (
          <li>
            {pendingPayments} pending payment{pendingPayments === 1 ? "" : "s"}{" "}
            started on it.
          </li>
        )}
        {nothingListed && (
          <li>It&apos;s assigned somewhere or has pending payments.</li>
        )}
      </ul>
      <p>
        {programs.length > 0 || isDefault
          ? `Reassign ${programs.length > 0 && isDefault ? "those programs and the default" : programs.length > 0 ? "those programs" : "the default"} to another gateway in Program routing first`
          : "Reassign it first"}
        {pendingPayments > 0 ? ", and let pending payments settle" : ""}, then{" "}
        {action} it.
      </p>
    </>
  )
}
