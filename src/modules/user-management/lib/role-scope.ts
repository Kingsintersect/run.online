// Which roles are granted per major program.
//
// Cross-program teaching (2026-09-26): a lecturer can teach B.Sc,
// postgraduate and business-school courses at once, so tutors, HODs and deans
// are no longer scoped to one major program. A tutor's major program comes from
// each course they're assigned; an HOD is identified by the department they
// head and a dean by the faculty they lead
// (sandbox/cross-program-teaching/API_CONTRACTS.md).
//
// Students and super admins were never scoped. Every other staff role
// (staff, bursary, director, admin) still is.

/** Roles that teach or lead across major programs. */
export const CROSS_PROGRAM_ROLE_PATTERN = /\b(tutor|lecturer|hod|dean)\b/i

/** Roles granted without a major program. */
export const UNSCOPED_ROLE_NAME_PATTERN =
  /\b(student|super\s*_?admin|tutor|lecturer|hod|dean)\b/i

export function isCrossProgramRole(roleName: string | null | undefined) {
  return roleName != null && CROSS_PROGRAM_ROLE_PATTERN.test(roleName)
}

export function isHodRole(roleName: string | null | undefined) {
  return roleName != null && /\bhod\b/i.test(roleName)
}

export function isDeanRole(roleName: string | null | undefined) {
  return roleName != null && /\bdean\b/i.test(roleName)
}
