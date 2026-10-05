import { z } from "zod"
import { validateSplitEntries } from "../lib/split-calculator"

// Settlement accounts & split rules — sandbox/payment-routing (shared
// CONTRACT §4–§5), now documented in bruno/payment-routing. Not deployed on
// production yet, so the service falls back while they 404 (CLAUDE.md §14).

// ── Shared ──────────────────────────────────────────────────────────────

/**
 * Laravel error body: `{ message, code?, errors?, details? }` (422/403/409/
 * 502). `details` carries the conflicting ids on a 409 —
 * `splitRuleIds` for ACCOUNT_IN_SPLIT_RULE, `splitRuleId` for
 * SPLIT_RULE_EXISTS (bruno/payment-routing).
 */
export const ApiErrorBodySchema = z.looseObject({
  message: z.string().optional(),
  code: z.string().optional(),
  errors: z.record(z.string(), z.array(z.string())).optional(),
  details: z
    .looseObject({
      splitRuleIds: z.array(z.number()).optional(),
      splitRuleId: z.number().optional(),
    })
    .optional(),
})

// ── Banks ───────────────────────────────────────────────────────────────

export const BankSchema = z.object({
  code: z.string(),
  name: z.string(),
})
export const BankListSchema = z.array(BankSchema)

// ── Settlement accounts (§4) ────────────────────────────────────────────

export const GatewayLinkStatusSchema = z.enum(["LINKED", "PENDING", "FAILED"])

export const GatewayLinkSchema = z.object({
  gatewayId: z.number(),
  provider: z.string(),
  subaccountCode: z.string().nullable(),
  status: GatewayLinkStatusSchema,
  message: z.string().nullable(),
})

export const SettlementAccountSchema = z.object({
  id: z.number(),
  majorProgramId: z.number().nullable(),
  majorProgramName: z.string().nullable(),
  label: z.string(),
  bankCode: z.string(),
  bankName: z.string(),
  accountNumber: z.string(),
  accountName: z.string(),
  isActive: z.boolean(),
  gatewayLinks: z.array(GatewayLinkSchema).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export const SettlementAccountListSchema = z.array(SettlementAccountSchema)

const labelField = z
  .string()
  .trim()
  .min(3, "Label must be at least 3 characters")
  .max(120, "Label must be at most 120 characters")

const accountNumberField = z
  .string()
  .trim()
  .regex(/^\d{10}$/, "Account number must be exactly 10 digits (NUBAN)")

const bankCodeField = z.string().trim().min(1, "Choose a bank")

/** `POST /payments/settlement-accounts` — also the Add dialog's form schema. */
export const CreateSettlementAccountSchema = z.object({
  majorProgramId: z.number().int().positive().nullable(),
  label: labelField,
  bankCode: bankCodeField,
  accountNumber: accountNumberField,
  isActive: z.boolean(),
})

/** `PATCH /payments/settlement-accounts/{id}` — bank details are immutable. */
export const UpdateSettlementAccountSchema = z
  .object({
    label: labelField.optional(),
    isActive: z.boolean().optional(),
  })
  .refine((v) => v.label !== undefined || v.isActive !== undefined, {
    message: "Nothing to update",
  })

/** Edit dialog form (label + active only). */
export const EditSettlementAccountFormSchema = z.object({
  label: labelField,
  isActive: z.boolean(),
})

/** `POST /payments/settlement-accounts/resolve`. */
export const ResolveAccountSchema = z.object({
  bankCode: bankCodeField,
  accountNumber: accountNumberField,
})
export const ResolveAccountResponseSchema = z.object({
  accountName: z.string(),
})

// ── Split rules (§5) ────────────────────────────────────────────────────

export const SplitTypeSchema = z.enum(["PERCENTAGE", "FLAT"])
export const FeeBearerSchema = z.enum(["CUSTOMER", "INSTITUTION"])

export const SplitEntrySchema = z.object({
  settlementAccountId: z
    .number({ error: "Choose an account" })
    .int()
    .positive("Choose an account"),
  splitType: SplitTypeSchema,
  value: z.number({ error: "Enter a value" }).min(0, "Enter a value"),
  isDefault: z.boolean(),
})

export const SplitRuleSchema = z.object({
  id: z.number(),
  majorProgramId: z.number(),
  feeTypeId: z.number().nullable(),
  feeTypeName: z.string().nullable(),
  feeBearer: FeeBearerSchema,
  isActive: z.boolean(),
  entries: z.array(SplitEntrySchema),
  updatedAt: z.string(),
})
export const SplitRuleListSchema = z.array(SplitRuleSchema)

/**
 * `PUT /payments/split-rules` (upsert) — also the rule editor's form schema.
 * superRefine applies the same rules the server enforces (§5): ≥1 entry,
 * exactly one default, percentages 0<v≤100 summing to ≤100, flat > 0 at
 * kobo precision, no duplicate account.
 */
export const UpsertSplitRuleSchema = z
  .object({
    id: z.number().int().positive().optional(),
    majorProgramId: z.number().int().positive(),
    feeTypeId: z.number().int().positive().nullable(),
    feeBearer: FeeBearerSchema,
    isActive: z.boolean(),
    entries: z.array(SplitEntrySchema),
  })
  .superRefine((rule, ctx) => {
    for (const issue of validateSplitEntries(rule.entries)) {
      const path: (string | number)[] =
        issue.entryIndex !== undefined && issue.field
          ? ["entries", issue.entryIndex, issue.field]
          : ["entries"]
      ctx.addIssue({ code: "custom", message: issue.message, path })
    }
  })
