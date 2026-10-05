"use client"

import { TriangleAlert } from "lucide-react"
import { ClearAllCard } from "./clear-all-card"
import { LockDangerZone } from "./lock-danger-zone"
import { PreservedPanel } from "./preserved-panel"
import { ResetFlowDialog } from "./reset-flow-dialog"
import { ResetGroupsList } from "./reset-groups-list"
import { ResetStatusBanner } from "./reset-status-banner"
import { RunHistoryTable } from "./run-history-table"

/** Super admin: clear test data before go-live (sandbox/instance-reset). */
export function InstanceResetShell() {
  return (
    <div className="mx-auto space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <header className="space-y-3">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Instance reset
        </h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Clears test data from this portal before it goes live: pick a group to
          clear, or wipe everything for a fresh start. Each reset shows a
          preview of exactly which rows will go, also deletes what the portal
          created in Moodle, and takes a database backup on the server first.
        </p>
        <div
          role="note"
          className="flex max-w-3xl gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/30 dark:text-red-100"
        >
          <TriangleAlert
            className="mt-0.5 size-4 shrink-0"
            aria-hidden="true"
          />
          <p>
            <span className="font-semibold">Destructive and irreversible.</span>{" "}
            Deleted records can&apos;t be restored from the portal; only a
            server administrator can restore the backup. Never use this on an
            instance that real students or staff are using.
          </p>
        </div>
      </header>

      <ResetStatusBanner />
      <ClearAllCard />
      <ResetGroupsList />
      <PreservedPanel />
      <RunHistoryTable />
      <LockDangerZone />
      <ResetFlowDialog />
    </div>
  )
}
