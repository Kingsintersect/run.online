import type { AcademicSession } from "@/types/school"

/**
 * Resolves "the" active academic session for a given major program.
 *
 * Major-Program Scoping — sandbox/major-program-scoping/README.md §4.B.
 * Sessions can be scoped to a specific major program (letting e.g.
 * Undergraduate and Postgraduate run independent calendars); this prefers
 * the scoped match over the institution-wide default.
 *
 * Resolution order: an active session scoped to `majorProgramId` > an
 * active institution-wide (`majorProgramId: null`) session > `null` if
 * neither exists.
 */
export function resolveActiveSession(
  sessions: AcademicSession[] | undefined,
  majorProgramId?: number | null
): AcademicSession | null {
  if (!sessions?.length) return null

  if (majorProgramId != null) {
    const scoped = sessions.find(
      (s) => s.isActive && s.majorProgramId === majorProgramId
    )
    if (scoped) return scoped
  }

  return sessions.find((s) => s.isActive && s.majorProgramId == null) ?? null
}
