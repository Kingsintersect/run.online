import { z } from "zod"
import { ApiClientError } from "@/lib/clients/apiClient"

export interface SyncErrorExplanation {
  /** One short sentence for a banner or empty state. */
  description: string
  /** True when the problem is on the server (nothing the user can fix). */
  serverSide: boolean
}

const ErrorBodySchema = z.object({ message: z.string().optional() })

// Plain-language reason a Moodle-sync request failed, for every
// "Couldn't load …" state in this module. 401 gets its own wording: the app
// only shows these screens to signed-in users whose session was confirmed
// with /auth/me (AuthSessionBridge), so a 401 here means the server is
// refusing these routes (BACKEND_DEVIATIONS B15), not that the user must
// sign in again.
export function describeSyncError(
  error: Error | null | undefined
): SyncErrorExplanation {
  const status = error instanceof ApiClientError ? error.status : undefined
  if (status === 401)
    return {
      description:
        "The server is currently refusing Moodle sync requests, even though you're signed in. This is a server problem, not your account, and no data has been lost. Please let the technical team know.",
      serverSide: true,
    }
  if (status === 403)
    return {
      description:
        "Your account doesn't have permission to see this. Ask an administrator if you need access.",
      serverSide: false,
    }
  if (status === 404)
    return {
      description: "This couldn't be found. It may have been removed.",
      serverSide: false,
    }
  if (status != null && status >= 500)
    return {
      description:
        "The server had a problem loading this from Moodle. Please try again in a few minutes.",
      serverSide: true,
    }
  if (error && status == null)
    return {
      description:
        "Couldn't reach the server. Check your internet connection and try again.",
      serverSide: false,
    }
  const body =
    error instanceof ApiClientError
      ? ErrorBodySchema.safeParse(error.data)
      : null
  return {
    description:
      (body?.success ? body.data.message : undefined) ?? "Please try again.",
    serverSide: false,
  }
}
