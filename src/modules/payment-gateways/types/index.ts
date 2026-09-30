import type { z } from "zod"
import type {
  ActiveGatewayProviderSchema,
  AssignmentFormSchema,
  AssignmentHistoryEntrySchema,
  CreateGatewayPayloadSchema,
  CredentialFieldSchema,
  GatewayAssignmentSchema,
  GatewayAssignmentsSchema,
  GatewayCredentialSchema,
  GatewayEnvironmentSchema,
  GatewayFormBaseSchema,
  GatewayHealthStatusSchema,
  GatewayProviderSchema,
  GatewayTestResultSchema,
  PaymentGatewaySchema,
  UpdateActiveGatewayPayloadSchema,
  UpdateAssignmentPayloadSchema,
  UpdateDefaultGatewayPayloadSchema,
  UpdateGatewayPayloadSchema,
} from "../schemas"

export type ActiveGatewayProvider = z.infer<typeof ActiveGatewayProviderSchema>
export type UpdateActiveGatewayPayload = z.infer<
  typeof UpdateActiveGatewayPayloadSchema
>

export type CredentialField = z.infer<typeof CredentialFieldSchema>
export type GatewayProvider = z.infer<typeof GatewayProviderSchema>
export type GatewayEnvironment = z.infer<typeof GatewayEnvironmentSchema>
export type GatewayHealthStatus = z.infer<typeof GatewayHealthStatusSchema>
export type GatewayCredential = z.infer<typeof GatewayCredentialSchema>
export type PaymentGateway = z.infer<typeof PaymentGatewaySchema>
export type CreateGatewayPayload = z.infer<typeof CreateGatewayPayloadSchema>
export type UpdateGatewayPayload = z.infer<typeof UpdateGatewayPayloadSchema>
export type GatewayTestResult = z.infer<typeof GatewayTestResultSchema>
export type GatewayAssignment = z.infer<typeof GatewayAssignmentSchema>
export type GatewayAssignments = z.infer<typeof GatewayAssignmentsSchema>
export type UpdateAssignmentPayload = z.infer<
  typeof UpdateAssignmentPayloadSchema
>
export type UpdateDefaultGatewayPayload = z.infer<
  typeof UpdateDefaultGatewayPayloadSchema
>
export type AssignmentHistoryEntry = z.infer<
  typeof AssignmentHistoryEntrySchema
>
export type AssignmentFormValues = z.infer<typeof AssignmentFormSchema>
export type GatewayFormValues = z.infer<typeof GatewayFormBaseSchema>

/**
 * "live": the proposed /payments/* route answered. "fallback": it isn't
 * built yet, so the data is derived from what exists today (Settings rows,
 * the major programs list, a static provider catalog).
 */
export type DataSource = "live" | "fallback"

export interface Sourced<T> {
  source: DataSource
  data: T
}

/**
 * The institution default gateway, whichever API supplied it.
 * "assignments": the proposed `/payments/gateway-assignments` (wins when it
 * exists). "active-gateway": the live `GET /fees/gateway` switch. null: the
 * server told us neither.
 */
export interface InstitutionDefaultGateway {
  via: "assignments" | "active-gateway" | null
  /** Gateway id; null when unset or only a provider is known. */
  gatewayId: number | null
  /** Provider slug (`credo`, `fcmb`, …) when known. */
  provider: string | null
}
