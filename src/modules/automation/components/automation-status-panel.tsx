"use client"

import { toast } from "sonner"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { useAutomations } from "../hooks/use-automations"
import { useSetAutomationEnabled } from "../hooks/use-automation-mutations"
import { AUTOMATION_CATALOG } from "../lib/catalog"
import type { Automation } from "../types"

const RESULT_STYLE: Record<NonNullable<Automation["lastResult"]>, string> = {
  OK: "text-emerald-700 dark:text-emerald-300",
  PARTIAL: "text-amber-700 dark:text-amber-300",
  FAILED: "text-red-700 dark:text-red-300",
}

function fmt(date: string | null) {
  if (!date) return "Never run"
  return new Date(date).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

// Which of the proposed automations (sandbox/automation) the server runs,
// and what is still manual. Rows come from the server's registry when it
// exists; every proposed automation it doesn't list shows as still manual.
export function AutomationStatusPanel() {
  const q = useAutomations()
  const toggle = useSetAutomationEnabled()

  if (q.isLoading)
    return (
      <div className="h-40 animate-pulse rounded-2xl bg-muted/40" aria-busy />
    )
  if (q.isError)
    return (
      <p role="alert" className="text-sm text-destructive">
        Couldn&apos;t load automations: {q.error.message}
      </p>
    )

  const live = q.data ?? null
  const byKey = new Map((live ?? []).map((a) => [a.key, a]))
  const extra = (live ?? []).filter(
    (a) => !AUTOMATION_CATALOG.some((c) => c.key === a.key)
  )
  const built = AUTOMATION_CATALOG.filter((c) => byKey.has(c.key)).length

  const setEnabled = async (a: Automation, enabled: boolean) => {
    try {
      await toggle.mutateAsync({ key: a.key, enabled })
      toast.success(`${a.name} ${enabled ? "switched on" : "paused"}.`)
    } catch (error) {
      if (error instanceof Error) toast.error(error.message)
    }
  }

  const row = (
    key: string,
    step: number | null,
    name: string,
    a: Automation | undefined,
    today: string | null
  ) => (
    <tr key={key} className="border-b border-border/50 align-top last:border-0">
      <td className="px-3 py-2.5 text-xs text-muted-foreground tabular-nums">
        {step ?? "—"}
      </td>
      <td className="px-3 py-2.5">
        <p className="text-sm font-medium text-foreground">{a?.name ?? name}</p>
        <p className="text-xs text-muted-foreground">
          {a ? (a.description ?? "") : today}
        </p>
      </td>
      <td className="px-3 py-2.5 text-xs">
        {a ? (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 font-semibold",
              a.enabled
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                : "bg-slate-100 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300"
            )}
          >
            {a.enabled ? "Automatic" : "Paused"}
          </span>
        ) : (
          <span className="rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            Still manual
          </span>
        )}
      </td>
      <td className="px-3 py-2.5 text-xs text-muted-foreground">
        {a ? (
          <>
            <span>{fmt(a.lastRunAt)}</span>
            {a.lastResult && (
              <span
                className={cn("ml-1 font-medium", RESULT_STYLE[a.lastResult])}
              >
                · {a.lastResult}
                {a.lastAffected != null && ` (${a.lastAffected})`}
              </span>
            )}
            {a.lastMessage && <span className="block">{a.lastMessage}</span>}
          </>
        ) : (
          "—"
        )}
      </td>
      <td className="px-3 py-2.5 text-right">
        {a && (
          <Switch
            checked={a.enabled}
            disabled={toggle.isPending}
            onCheckedChange={(v) => void setEnabled(a, v)}
            aria-label={`${a.enabled ? "Pause" : "Switch on"} ${a.name}`}
          />
        )}
      </td>
    </tr>
  )

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {live == null
          ? "The server doesn't report its automations yet, so every proposed automation is shown as still manual. Rows switch to Automatic as the backend ships them, with no portal change."
          : `${built} of ${AUTOMATION_CATALOG.length} proposed automations are running on the server.`}{" "}
        Approving, publishing, locking, committing and waiving stay manual on
        purpose.
      </p>
      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full min-w-[720px] text-sm">
          <caption className="sr-only">Automations</caption>
          <thead>
            <tr className="border-b border-border bg-muted/30 text-left text-[11px] tracking-wide text-muted-foreground uppercase">
              <th scope="col" className="px-3 py-2.5">
                Step
              </th>
              <th scope="col" className="px-3 py-2.5">
                Automation
              </th>
              <th scope="col" className="px-3 py-2.5">
                Status
              </th>
              <th scope="col" className="px-3 py-2.5">
                Last run
              </th>
              <th scope="col" className="px-3 py-2.5 text-right">
                <span className="sr-only">On or paused</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {AUTOMATION_CATALOG.map((c) =>
              row(c.key, c.step, c.name, byKey.get(c.key), c.today)
            )}
            {extra.map((a) => row(a.key, null, a.name, a, null))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
