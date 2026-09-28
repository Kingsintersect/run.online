import type { z } from "zod"
import apiClient, { ApiClientError } from "@/lib/clients/apiClient"
import {
  TeachingScopeResponseSchema,
  type TeachingScopeEntry,
} from "@/schemas/teaching-scope.schema"

const AUTH = { access_token: true } as const

export const teachingScopeKeys = {
  all: ["teaching-scope"] as const,
  mine: () => [...teachingScopeKeys.all, "me"] as const,
}

export const teachingScopeApi = {
  /**
   * The caller's teaching scope, or `null` when the server has no such route
   * yet (404/405), in which case the client derives it (useMyTeachingScope).
   */
  async getMine(): Promise<TeachingScopeEntry[] | null> {
    try {
      const res = await apiClient.get<
        z.input<typeof TeachingScopeResponseSchema>
      >("/me/teaching-scope", AUTH)
      return TeachingScopeResponseSchema.parse(res).data
    } catch (error) {
      if (
        error instanceof ApiClientError &&
        (error.status === 404 || error.status === 405)
      )
        return null
      throw error
    }
  },
}
