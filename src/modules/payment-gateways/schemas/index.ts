import { z } from "zod"

// Payment routing (sandbox/payment-routing API_CONTRACTS §1–§3, documented in
// bruno/payment-routing; live on QHUB 2026-10-05). Every response is parsed so
// a shape drift shows up as an error instead of a half-rendered screen.

// ── §1 Provider catalog ─────────────────────────────────────────────

export const SplitTypeSchema = z.enum(["PERCENTAGE", "FLAT"])

export const CredentialFieldSchema = z.object({
  field: z.string().min(1),
  label: z.string(),
  secret: z.boolean(),
  required: z.boolean(),
  placeholder: z.string().nullish(),
})

export const GatewayProviderSchema = z.object({
  provider: z.string().min(1),
  name: z.string(),
  serverSupported: z.boolean(),
  supportsSplit: z.boolean(),
  splitTypes: z.array(SplitTypeSchema),
  credentialFields: z.array(CredentialFieldSchema),
})

export const GatewayProviderListSchema = z.array(GatewayProviderSchema)

// ── §2 Gateway configurations ───────────────────────────────────────

export const GatewayEnvironmentSchema = z.enum(["LIVE", "TEST"])
export const GatewayHealthStatusSchema = z.enum(["OK", "FAILED", "UNKNOWN"])

export const GatewayCredentialSchema = z.object({
  field: z.string(),
  label: z.string(),
  secret: z.boolean(),
  isSet: z.boolean(),
  maskedValue: z.string().nullable(),
  /** Always null for a secret. */
  value: z.string().nullable(),
})

export const GatewayHealthSchema = z.object({
  status: GatewayHealthStatusSchema,
  checkedAt: z.string().nullable(),
  message: z.string().nullable(),
})

export const PaymentGatewaySchema = z.object({
  id: z.number(),
  provider: z.string(),
  displayName: z.string(),
  environment: GatewayEnvironmentSchema,
  isEnabled: z.boolean(),
  credentials: z.array(GatewayCredentialSchema),
  webhookUrl: z.string(),
  health: GatewayHealthSchema,
  assignedMajorProgramIds: z.array(z.number()),
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
})

export const PaymentGatewayListSchema = z.array(PaymentGatewaySchema)

export const CreateGatewayPayloadSchema = z.object({
  provider: z.string().min(1, "Pick a provider"),
  displayName: z
    .string()
    .trim()
    .min(2, "Display name must be at least 2 characters")
    .max(100, "Display name is too long"),
  environment: GatewayEnvironmentSchema,
  isEnabled: z.boolean(),
  credentials: z.record(z.string(), z.string()),
})

/** All optional; a blank or omitted secret keeps the current one. */
export const UpdateGatewayPayloadSchema = CreateGatewayPayloadSchema.omit({
  provider: true,
}).partial()

export const GatewayTestResultSchema = z.object({
  status: z.enum(["OK", "FAILED"]),
  message: z.string().nullable(),
  checkedAt: z.string().nullable(),
})

// ── §3 Program → gateway assignment ─────────────────────────────────

export const ActorSchema = z.object({
  id: z.number(),
  name: z.string(),
})

export const GatewayAssignmentSchema = z.object({
  majorProgramId: z.number(),
  majorProgramName: z.string(),
  gatewayId: z.number().nullable(),
  fallbackGatewayId: z.number().nullable(),
  autoFailover: z.boolean(),
  effectiveGatewayId: z.number().nullable(),
  updatedBy: ActorSchema.nullable(),
  updatedAt: z.string().nullable(),
})

export const GatewayAssignmentsSchema = z.object({
  defaultGatewayId: z.number().nullable(),
  assignments: z.array(GatewayAssignmentSchema),
})

const REASON_MIN = 5

export const ReasonSchema = z
  .string()
  .trim()
  .min(REASON_MIN, `Give a reason of at least ${REASON_MIN} characters`)
  .max(500, "Reason is too long")

export const UpdateAssignmentPayloadSchema = z
  .object({
    gatewayId: z.number().nullable(),
    fallbackGatewayId: z.number().nullable(),
    autoFailover: z.boolean(),
    reason: ReasonSchema,
  })
  .refine(
    (v) => v.fallbackGatewayId === null || v.fallbackGatewayId !== v.gatewayId,
    {
      message: "The fallback gateway must differ from the primary gateway",
      path: ["fallbackGatewayId"],
    }
  )
  .refine((v) => !v.autoFailover || v.fallbackGatewayId !== null, {
    message: "Auto-failover needs a fallback gateway",
    path: ["autoFailover"],
  })

export const UpdateDefaultGatewayPayloadSchema = z.object({
  gatewayId: z.number().nullable(),
  reason: ReasonSchema,
})

// ── Live institution-wide switch (bruno/fee/Payments - Active Gateway) ──
// `GET /fees/gateway` / `PATCH /fees/gateway` (super_admin only; 422 on any
// other value). The server only knows these two clients today.

export const ACTIVE_GATEWAY_PROVIDERS = ["credo", "fcmb"] as const
export const ActiveGatewayProviderSchema = z.enum(ACTIVE_GATEWAY_PROVIDERS)

// After the payment-routing migration GET /fees/gateway reads the
// institution DEFAULT assignment, so `activeGateway` is null when no default
// is configured (bruno/fee/Payments - Active Gateway - Get.bru).
export const ActiveGatewayResponseSchema = z.object({
  data: z.object({ activeGateway: ActiveGatewayProviderSchema.nullable() }),
})

// B30 item 1 (2026-09-29): the server accepts an optional `reason` (max 500)
// and writes it to the audit log (AuditLog entityType "Setting", action
// "UPDATE") when the gateway actually changes. The UI always asks for one, so
// the payload requires it here.
export const UpdateActiveGatewayPayloadSchema = z.object({
  gateway: ActiveGatewayProviderSchema,
  reason: ReasonSchema,
})

export const AssignmentHistoryEntrySchema = z.object({
  id: z.number(),
  majorProgramId: z.number().nullable(),
  fromGatewayId: z.number().nullable(),
  toGatewayId: z.number().nullable(),
  reason: z.string().nullable(),
  trigger: z.enum(["MANUAL", "AUTO_FAILOVER"]),
  changedBy: ActorSchema.nullable(),
  changedAt: z.string(),
})

export const AssignmentHistorySchema = z.array(AssignmentHistoryEntrySchema)

// ── Form schemas (UI) ───────────────────────────────────────────────

/**
 * The routing edit form. Selects hold strings ("none" = no gateway); the
 * dialog converts to `UpdateAssignmentPayload` and validates that again
 * before sending.
 */
export const AssignmentFormSchema = z
  .object({
    gatewayId: z.string(),
    fallbackGatewayId: z.string(),
    autoFailover: z.boolean(),
    reason: ReasonSchema,
  })
  .refine(
    (v) =>
      v.fallbackGatewayId === "none" || v.fallbackGatewayId !== v.gatewayId,
    {
      message: "The fallback gateway must differ from the primary gateway",
      path: ["fallbackGatewayId"],
    }
  )
  .refine((v) => !v.autoFailover || v.fallbackGatewayId !== "none", {
    message: "Auto-failover needs a fallback gateway",
    path: ["autoFailover"],
  })

export const GatewayFormBaseSchema = z.object({
  provider: z.string().min(1, "Pick a provider"),
  displayName: z
    .string()
    .trim()
    .min(2, "Display name must be at least 2 characters")
    .max(100, "Display name is too long"),
  environment: GatewayEnvironmentSchema,
  isEnabled: z.boolean(),
  credentials: z.record(z.string(), z.string()),
})

interface RequiredCredential {
  field: string
  label: string
  /** Already stored on the server, so a blank field keeps it. */
  isSet: boolean
}

/**
 * The add/edit gateway form, with the provider's required credentials
 * checked. On edit a credential that is already set may stay blank ("keep
 * current").
 */
export function buildGatewayFormSchema(required: RequiredCredential[]) {
  return GatewayFormBaseSchema.superRefine((v, ctx) => {
    // A gateway may be saved disabled with credentials missing, to prepare
    // it ahead of time (bruno/payment-routing/Gateways - Create.bru).
    if (!v.isEnabled) return
    for (const field of required) {
      if (field.isSet) continue
      if (!(v.credentials[field.field] ?? "").trim()) {
        ctx.addIssue({
          code: "custom",
          message: `${field.label} is required`,
          path: ["credentials", field.field],
        })
      }
    }
  })
}

// ── Error bodies (bruno/payment-routing) ────────────────────────────
// Laravel's `{ message, errors }` 422 shape, plus the routing API's own
// `{ message, code, details }` for GATEWAY_IN_USE / GATEWAY_NOT_READY /
// GATEWAY_NOT_SUPPORTED / DEFAULT_REQUIRED. Every field is optional so one
// schema reads all of them; lib/gateway-errors.ts maps them to messages.

/** `details` of 409 GATEWAY_IN_USE (Gateways - Delete/Update.bru). */
export const GatewayInUseDetailsSchema = z.object({
  majorProgramIds: z.array(z.number()).catch([]),
  isDefault: z.boolean().catch(false),
  pendingPayments: z.number().catch(0),
})

export const GatewayErrorBodySchema = z.object({
  message: z.string().optional(),
  code: z.string().optional(),
  details: GatewayInUseDetailsSchema.optional().catch(undefined),
  errors: z
    .record(z.string(), z.union([z.array(z.string()), z.string()]))
    .optional()
    .catch(undefined),
})
