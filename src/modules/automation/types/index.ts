import type { z } from "zod"
import type {
  AutomationListSchema,
  AutomationResultSchema,
  AutomationSchema,
  AutomationTriggerSchema,
  SetAutomationEnabledSchema,
} from "../schemas"

export type Automation = z.infer<typeof AutomationSchema>
export type AutomationList = z.infer<typeof AutomationListSchema>
export type AutomationTrigger = z.infer<typeof AutomationTriggerSchema>
export type AutomationResult = z.infer<typeof AutomationResultSchema>
export type SetAutomationEnabled = z.infer<typeof SetAutomationEnabledSchema>
