import { z } from "zod"

// GET /configuration/automations (proposed, sandbox/automation §0).

export const AutomationTriggerSchema = z.enum([
  "EVENT",
  "SCHEDULE",
  "EVENT_AND_SCHEDULE",
])

export const AutomationResultSchema = z.enum(["OK", "PARTIAL", "FAILED"])

export const AutomationSchema = z.object({
  key: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  trigger: AutomationTriggerSchema,
  schedule: z.string().nullable(),
  enabled: z.boolean(),
  lastRunAt: z.string().nullable(),
  lastResult: AutomationResultSchema.nullable(),
  lastAffected: z.number().nullable(),
  lastMessage: z.string().nullable(),
})

export const AutomationListSchema = z.object({
  automations: z.array(AutomationSchema),
})

export const SetAutomationEnabledSchema = z.object({
  enabled: z.boolean(),
})
