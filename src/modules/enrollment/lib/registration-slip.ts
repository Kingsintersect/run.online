import type { RegistrationContext } from "../types"

export interface RegistrationSlipRow {
  offeringId: number
  code: string
  title: string
  units: number | null
  kind: "Carryover" | "Required" | "Elective" | "Registered"
}

export interface RegistrationSlip {
  semesterName: string
  rows: RegistrationSlipRow[]
  totalUnits: number
}

/**
 * The courses a student has registered this semester, as the registration
 * context reports them (`registered_offering_ids`). A registered offering
 * that isn't in the context's course lists is still listed, by offering id,
 * rather than silently dropped.
 */
export function buildRegistrationSlip(
  context: RegistrationContext
): RegistrationSlip {
  const byOffering = new Map<number, RegistrationSlipRow>()
  for (const c of context.level_courses)
    byOffering.set(c.offering_id, {
      offeringId: c.offering_id,
      code: c.course.code,
      title: c.course.title,
      units: c.course.credit_units,
      kind: c.is_required ? "Required" : "Elective",
    })
  for (const c of context.carryover_courses)
    if (c.offering_id != null)
      byOffering.set(c.offering_id, {
        offeringId: c.offering_id,
        code: c.course.code,
        title: c.course.title,
        units: c.course.credit_units,
        kind: "Carryover",
      })

  const rows = context.registered_offering_ids
    .map(
      (id) =>
        byOffering.get(id) ?? {
          offeringId: id,
          code: `Offering ${id}`,
          title: "Course details not available",
          units: null,
          kind: "Registered" as const,
        }
    )
    .sort((a, b) => a.code.localeCompare(b.code))

  return {
    semesterName: context.semester.name,
    rows,
    totalUnits: rows.reduce((sum, r) => sum + (r.units ?? 0), 0),
  }
}
