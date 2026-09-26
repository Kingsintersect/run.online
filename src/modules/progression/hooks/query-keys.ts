import type { PromotionRunFilters, RunItemFilters } from "../types"

// Session promotion & standings. `*All()` prefixes match every entry of a
// slice, for invalidation after a write that can touch any of them.
export const progressionKeys = {
  all: ["progression"] as const,

  policiesAll: () => [...progressionKeys.all, "policy"] as const,
  policy: (majorProgramId: number) =>
    [...progressionKeys.policiesAll(), majorProgramId] as const,

  readinessAll: () => [...progressionKeys.all, "readiness"] as const,
  semesterRollover: (semesterId: number, majorProgramId: number | null) =>
    [
      ...progressionKeys.readinessAll(),
      "semester",
      semesterId,
      majorProgramId,
    ] as const,
  sessionClose: (
    sessionId: number,
    targetSessionId: number | null,
    majorProgramId: number | null
  ) =>
    [
      ...progressionKeys.readinessAll(),
      "session",
      majorProgramId,
      sessionId,
      targetSessionId,
    ] as const,

  runsAll: () => [...progressionKeys.all, "runs"] as const,
  runs: (filters: PromotionRunFilters) =>
    [...progressionKeys.runsAll(), filters] as const,
  runDetailAll: () => [...progressionKeys.all, "run"] as const,
  run: (runId: number) => [...progressionKeys.runDetailAll(), runId] as const,
  runItemsAll: () => [...progressionKeys.all, "run-items"] as const,
  runItemsForRun: (runId: number) =>
    [...progressionKeys.runItemsAll(), runId] as const,
  runItems: (runId: number, filters: RunItemFilters) =>
    [...progressionKeys.runItemsForRun(runId), filters] as const,

  standingsAll: () => [...progressionKeys.all, "standings"] as const,
  studentStandings: (studentId: number) =>
    [...progressionKeys.standingsAll(), "student", studentId] as const,
  myStandings: () => [...progressionKeys.standingsAll(), "me"] as const,

  outstandingAll: () => [...progressionKeys.all, "outstanding"] as const,
  studentOutstanding: (studentId: number) =>
    [...progressionKeys.outstandingAll(), "student", studentId] as const,
  myOutstanding: () => [...progressionKeys.outstandingAll(), "me"] as const,
} as const
