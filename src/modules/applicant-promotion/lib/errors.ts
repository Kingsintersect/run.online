import { ApiClientError } from "@/lib/clients/apiClient"
import { friendlyMessage } from "@/lib/errors"
import { isEndpointMissing } from "@/modules/student-grades/lib/results-errors"
import { PromotionErrorBodySchema } from "../schemas"
import type { PromotionError } from "../types"

export const PROMOTION_UNAVAILABLE_MESSAGE =
  "Promoting an applicant manually isn't available on this server."

const FORBIDDEN_MESSAGE =
  "You're not permitted to promote applicants — only an administrator can."

/** Maps a promote failure to what the dialog shows. */
export function toPromotionError(error: Error): PromotionError {
  // Only Laravel's "route could not be found" 404, or a 405, counts as the
  // endpoint being absent — a model 404 on a real route is a normal error.
  if (isEndpointMissing(error))
    return {
      kind: "not-available",
      status: error instanceof ApiClientError ? (error.status ?? null) : null,
      message: PROMOTION_UNAVAILABLE_MESSAGE,
    }

  if (error instanceof ApiClientError) {
    const status = error.status ?? null
    const body = PromotionErrorBodySchema.safeParse(error.data)
    const firstFieldError = body.success
      ? Object.values(body.data.errors ?? {})[0]?.[0]
      : undefined
    const serverMessage =
      (body.success ? body.data.message : undefined) ?? error.message

    if (status === 403) {
      // An out-of-scope rejection carries its own marker; anything else on
      // this route is the literal admin-role gate.
      const friendly = friendlyMessage(serverMessage)
      return {
        kind: "forbidden",
        status,
        message: friendly !== serverMessage ? friendly : FORBIDDEN_MESSAGE,
      }
    }
    if (status === 409 || status === 422 || status === 400 || status === 404)
      return {
        kind: "rejected",
        status,
        message: firstFieldError ?? serverMessage,
      }
    return { kind: "unknown", status, message: friendlyMessage(serverMessage) }
  }

  return {
    kind: "unknown",
    status: null,
    message: error.message || "Couldn't promote this applicant.",
  }
}
