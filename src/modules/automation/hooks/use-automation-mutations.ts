"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { automationService } from "../services/automation.service"
import { automationKeys } from "./query-keys"

export function useSetAutomationEnabled() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { key: string; enabled: boolean }) =>
      automationService.setEnabled(v.key, { enabled: v.enabled }),
    onSuccess: () => qc.invalidateQueries({ queryKey: automationKeys.list() }),
  })
}
