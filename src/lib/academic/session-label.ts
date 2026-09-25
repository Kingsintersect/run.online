import type { AcademicSession, MajorProgram } from "@/types/school"

// Major-Program Scoping — every academic session belongs to one major program
// (`majorProgramId`), or to none (`null` = an institution-wide session shared
// by every programme). Several programmes routinely run a session with the
// same name (e.g. three "2026/2027" sessions), so a session's name alone is
// ambiguous in any picker. These helpers give every session a label that
// names its programme too, e.g. "2026/2027 — Part-Time Programmes".

/** Label for a session with no major program (`majorProgramId: null`). */
export const INSTITUTION_WIDE_SESSION_LABEL = "All programmes"

type MajorProgramLike = Pick<MajorProgram, "id" | "name">

/**
 * Plain-language name of the programme a session belongs to. `null` when the
 * programme can't be named yet (major programs still loading/unavailable) —
 * callers then fall back to the bare session name rather than guess.
 */
export function sessionProgramLabel(
  majorProgramId: number | null | undefined,
  majorPrograms: readonly MajorProgramLike[] | undefined
): string | null {
  if (majorProgramId == null) return INSTITUTION_WIDE_SESSION_LABEL
  if (!majorPrograms?.length) return null
  return (
    majorPrograms.find((mp) => mp.id === majorProgramId)?.name ??
    `Programme #${majorProgramId}`
  )
}

/** "2026/2027 — Part-Time Programmes" (or just the name when unresolvable). */
export function formatSessionLabel(
  session: Pick<AcademicSession, "name" | "majorProgramId">,
  majorPrograms: readonly MajorProgramLike[] | undefined
): string {
  const program = sessionProgramLabel(session.majorProgramId, majorPrograms)
  return program ? `${session.name} — ${program}` : session.name
}

export interface SessionOption {
  /** Session id as a string — ready for a `<select>`/Radix `value`. */
  value: string
  label: string
  session: AcademicSession
}

export interface SessionOptionGroup {
  majorProgramId: number | null
  /** Programme name, or {@link INSTITUTION_WIDE_SESSION_LABEL}. */
  label: string
  options: SessionOption[]
}

/**
 * Builds labelled options, ordered by programme (institution-wide first,
 * then alphabetically by programme name) while keeping each programme's
 * sessions in their original API order.
 */
export function buildSessionOptions(
  sessions: readonly AcademicSession[] | undefined,
  majorPrograms: readonly MajorProgramLike[] | undefined
): SessionOption[] {
  return groupSessionOptions(sessions, majorPrograms).flatMap((g) => g.options)
}

export function groupSessionOptions(
  sessions: readonly AcademicSession[] | undefined,
  majorPrograms: readonly MajorProgramLike[] | undefined
): SessionOptionGroup[] {
  const groups = new Map<number | null, SessionOptionGroup>()
  for (const session of sessions ?? []) {
    const key = session.majorProgramId ?? null
    let group = groups.get(key)
    if (!group) {
      group = {
        majorProgramId: key,
        label: sessionProgramLabel(key, majorPrograms) ?? "Loading programme…",
        options: [],
      }
      groups.set(key, group)
    }
    group.options.push({
      value: String(session.id),
      label: formatSessionLabel(session, majorPrograms),
      session,
    })
  }
  return [...groups.values()].sort((a, b) => {
    if (a.majorProgramId === null) return -1
    if (b.majorProgramId === null) return 1
    return a.label.localeCompare(b.label)
  })
}
