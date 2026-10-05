import type { PromotionRun } from "../types"

// B30 item 12 (2026-09-29): a SESSION-structured major program's final
// session can be closed with a run that has no target session. Every screen
// that names a run's target reads it through these, so a null target shows
// an honest label instead of crashing.

export const NO_TARGET_LABEL = "no next session (final session)"

/** The run's target session name, or null when it was created without one. */
export function runTargetName(
  run: Pick<PromotionRun, "target_session">
): string | null {
  return run.target_session?.name ?? null
}

/** The target session name, or a plain "no next session" label. */
export function runTargetLabel(run: Pick<PromotionRun, "target_session">) {
  return runTargetName(run) ?? NO_TARGET_LABEL
}
