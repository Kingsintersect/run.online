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
   * The caller's teaching scope (bruno/user/Me - Teaching Scope.bru), or
   * `null` when a backend predates the route (404/405). useMyTeachingScope
   * then reports the scope as unavailable rather than empty.
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
