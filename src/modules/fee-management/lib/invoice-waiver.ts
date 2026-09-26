import type { InvoiceResponse, InvoiceWaiverActor } from "../types"

export interface InvoiceWaiver {
  /** Display name of whoever waived it, or null if the server didn't say. */
  by: string | null
  /** ISO timestamp, or null if the server didn't say. */
  at: string | null
  reason: string | null
}

function actorLabel(actor: InvoiceWaiverActor | null | undefined) {
  if (actor === null || actor === undefined) return null
  if (typeof actor === "number") return `User #${actor}`
  const full = [actor.firstName, actor.lastName].filter(Boolean).join(" ")
  return actor.name || full || `User #${actor.id}`
}

/**
 * Reads the waiver details off an invoice, whichever spelling the server
 * uses (see invoice.schema.ts). Returns null for an invoice that isn't
 * WAIVED. A WAIVED invoice from before the backend added the waiver
 * columns returns all-null fields, and the UI says the details weren't
 * recorded rather than inventing them.
 */
export function getInvoiceWaiver(
  invoice: InvoiceResponse
): InvoiceWaiver | null {
  if (invoice.status !== "WAIVED") return null
  return {
    by: actorLabel(invoice.waivedBy ?? invoice.waived_by),
    at: invoice.waivedAt ?? invoice.waived_at ?? null,
    reason: invoice.waiverReason ?? invoice.waiver_reason ?? null,
  }
}
