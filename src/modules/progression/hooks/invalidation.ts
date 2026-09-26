import type { QueryClient } from "@tanstack/react-query"
import { feeManagementKeys } from "@/services/feeManagementApi"
import { usersKeys } from "@/services/usersApi"
import { progressionKeys } from "./query-keys"
import type { RunStatus } from "../types"

/** Run header, its items and every runs list (counts change). */
export function invalidateRun(qc: QueryClient, runId: number) {
  return Promise.all([
    qc.invalidateQueries({ queryKey: progressionKeys.run(runId) }),
    qc.invalidateQueries({ queryKey: progressionKeys.runItemsForRun(runId) }),
    qc.invalidateQueries({ queryKey: progressionKeys.runsAll() }),
  ])
}

/** Everything a commit or reverse writes: standings, carryovers, student levels. */
export function invalidateStandingsWide(qc: QueryClient) {
  return Promise.all([
    qc.invalidateQueries({ queryKey: progressionKeys.standingsAll() }),
    qc.invalidateQueries({ queryKey: progressionKeys.outstandingAll() }),
    qc.invalidateQueries({ queryKey: progressionKeys.readinessAll() }),
    qc.invalidateQueries({ queryKey: usersKeys.students.all }),
  ])
}

/** Semester/session lock or activation: readiness and the session/semester lists. */
export function invalidateCalendar(qc: QueryClient) {
  return Promise.all([
    qc.invalidateQueries({ queryKey: progressionKeys.readinessAll() }),
    qc.invalidateQueries({ queryKey: feeManagementKeys.all }),
  ])
}

/** Called by usePromotionRun when a polled job settles. */
export async function invalidateAfterSettle(
  qc: QueryClient,
  runId: number,
  status: RunStatus
) {
  await Promise.all([
    qc.invalidateQueries({ queryKey: progressionKeys.runItemsForRun(runId) }),
    qc.invalidateQueries({ queryKey: progressionKeys.runsAll() }),
  ])
  if (status === "COMMITTED" || status === "REVERSED")
    await invalidateStandingsWide(qc)
}
