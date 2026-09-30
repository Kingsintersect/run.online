import type { InvoiceResponse } from "../types"

type InvoiceStudent = NonNullable<InvoiceResponse["student"]>

/**
 * A student's name off an invoice, whichever shape the server sends:
 * `fullName`, or bruno's documented `user: { firstName, lastName }`
 * (bruno/fee/Invoices - List.bru). Null when neither is present.
 */
export function studentDisplayName(
  student: InvoiceStudent | null | undefined
): string | null {
  if (!student) return null
  if (student.fullName) return student.fullName
  const full = [student.user?.firstName, student.user?.lastName]
    .filter(Boolean)
    .join(" ")
  return full || null
}
