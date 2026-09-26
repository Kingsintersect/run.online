"use client"

import Link from "next/link"
import { AlertTriangle, CheckCircle2, CreditCard } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  formatNaira,
  REGISTRATION_ERROR_MESSAGE,
} from "../lib/registration-copy"
import type { RegistrationContext, RegistrationGateInvoice } from "../types"

interface RegistrationDebtGateProps {
  context: RegistrationContext
}

function groupBySession(
  invoices: RegistrationGateInvoice[]
): [string, RegistrationGateInvoice[]][] {
  const groups = new Map<string, RegistrationGateInvoice[]>()
  for (const inv of invoices) {
    const list = groups.get(inv.session_name) ?? []
    list.push(inv)
    groups.set(inv.session_name, list)
  }
  return [...groups.entries()]
}

function InvoiceGroup({
  session,
  invoices,
}: {
  session: string
  invoices: RegistrationGateInvoice[]
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <p className="border-b border-border bg-muted/40 px-4 py-2 text-xs font-semibold text-foreground">
        {session}
      </p>
      <ul className="divide-y divide-border">
        {invoices.map((inv) => (
          <li
            key={inv.id}
            className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-xs"
          >
            <div>
              <p className="font-medium text-foreground">{inv.fee_type}</p>
              <p className="font-mono text-[11px] text-muted-foreground">
                {inv.invoice_number}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-semibold text-foreground">
                {formatNaira(inv.balance)}
              </span>
              <Button asChild size="sm" variant="outline" className="gap-1.5">
                <Link href={`/student/fees/${inv.id}`}>
                  <CreditCard size={13} aria-hidden />
                  Pay
                  <span className="sr-only"> invoice {inv.invoice_number}</span>
                </Link>
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

// The registration gate exactly as the backend reports it. Outstanding
// prior-session debt lists the invoices (by session) with a link into the
// existing payment flow; an admin allowance or waiver is stated plainly.
export function RegistrationDebtGate({ context }: RegistrationDebtGateProps) {
  const { gate, standing } = context
  const override = standing?.debt_override ?? null

  const allowance =
    standing?.financial_status === "OWING_ALLOWED" || override ? (
      <p className="flex gap-2 rounded-2xl border border-sky-500/30 bg-sky-500/5 p-3 text-xs text-sky-800 dark:text-sky-300">
        <CheckCircle2 size={14} className="mt-0.5 shrink-0" aria-hidden />
        <span>
          You still owe fees from a previous session, but you have been allowed
          to register
          {override?.by?.name ? ` by ${override.by.name}` : ""}
          {override?.reason ? ` (${override.reason})` : ""}. Please settle the
          balance when you can.
        </span>
      </p>
    ) : standing?.financial_status === "WAIVED" ? (
      <p className="flex gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs text-emerald-800 dark:text-emerald-300">
        <CheckCircle2 size={14} className="mt-0.5 shrink-0" aria-hidden />
        Your previous-session fees were waived, so they don&apos;t block
        registration.
      </p>
    ) : null

  if (gate.can_register) return allowance

  return (
    <section
      aria-labelledby="registration-gate-title"
      className="space-y-3 rounded-3xl border border-amber-500/30 bg-amber-500/5 p-5 dark:bg-amber-500/10"
    >
      <h2
        id="registration-gate-title"
        className="flex items-center gap-2 text-sm font-bold text-amber-800 dark:text-amber-300"
      >
        <AlertTriangle size={16} aria-hidden />
        You can&apos;t register yet
      </h2>
      {allowance}
      {gate.blockers.map((blocker, i) => {
        const friendly = REGISTRATION_ERROR_MESSAGE[blocker.code]
        const isDebt = blocker.code === "OUTSTANDING_DEBT"
        return (
          <div key={`${blocker.code}-${i}`} className="space-y-2">
            <p className="text-xs text-foreground/80">
              {friendly ?? blocker.message}
            </p>
            {friendly && blocker.message && blocker.message !== friendly && (
              <p className="text-[11px] text-muted-foreground">
                {blocker.message}
              </p>
            )}
            {isDebt &&
              groupBySession(blocker.invoices ?? []).map(
                ([session, invoices]) => (
                  <InvoiceGroup
                    key={session}
                    session={session}
                    invoices={invoices}
                  />
                )
              )}
            {isDebt && (
              <Link
                href="/student/fees"
                className="inline-block text-xs font-semibold text-primary hover:underline"
              >
                Go to my fees
              </Link>
            )}
          </div>
        )
      })}
    </section>
  )
}
