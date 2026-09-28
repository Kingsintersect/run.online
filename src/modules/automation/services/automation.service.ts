import apiClient, { ApiClientError } from "@/lib/clients/apiClient"
import {
  AutomationListSchema,
  AutomationSchema,
  SetAutomationEnabledSchema,
} from "../schemas"
import type { Automation, AutomationList, SetAutomationEnabled } from "../types"

const AUTH = { access_token: true } as const

/** Laravel's unregistered-route 404, or a 405: the endpoint isn't built yet. */
function isRouteMissing(error: unknown): boolean {
  if (!(error instanceof ApiClientError)) return false
  return (
    error.status === 405 ||
    (error.status === 404 &&
      /^The route .+ could not be found/i.test(error.message))
  )
}

export const automationService = {
  /**
   * Automations that exist on the server (sandbox/automation §0), or null
   * while the registry route doesn't exist yet.
   */
  async list(): Promise<Automation[] | null> {
    try {
      const res = await apiClient.get<{ data: AutomationList }>(
        "/configuration/automations",
        AUTH
      )
      return AutomationListSchema.parse(res.data).automations
    } catch (error) {
      if (isRouteMissing(error)) return null
      throw error
    }
  },

  async setEnabled(
    key: string,
    body: SetAutomationEnabled
  ): Promise<Automation> {
    const res = await apiClient.patch<
      { data: Automation },
      SetAutomationEnabled
    >(
      `/configuration/automations/${encodeURIComponent(key)}`,
      SetAutomationEnabledSchema.parse(body),
      AUTH
    )
    return AutomationSchema.parse(res.data)
  },
}
