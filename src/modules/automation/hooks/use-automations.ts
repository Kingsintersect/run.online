"use client"

import { useQuery } from "@tanstack/react-query"
import { automationService } from "../services/automation.service"
import { automationKeys } from "./query-keys"

/** The server's automations, or null while its registry isn't built. */
export function useAutomations() {
  return useQuery({
    queryKey: automationKeys.list(),
    queryFn: () => automationService.list(),
    staleTime: 60 * 1000,
  })
}
