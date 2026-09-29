import type { z } from "zod"
import type {
  ApiErrorBodySchema,
  BankSchema,
  CreateSettlementAccountSchema,
  EditSettlementAccountFormSchema,
  FeeBearerSchema,
  GatewayLinkSchema,
  GatewayLinkStatusSchema,
  ResolveAccountResponseSchema,
  ResolveAccountSchema,
  SettlementAccountSchema,
  SplitEntrySchema,
  SplitRuleSchema,
  SplitTypeSchema,
  UpdateSettlementAccountSchema,
  UpsertSplitRuleSchema,
} from "../schemas"

export type ApiErrorBody = z.infer<typeof ApiErrorBodySchema>
export type Bank = z.infer<typeof BankSchema>
export type GatewayLink = z.infer<typeof GatewayLinkSchema>
export type GatewayLinkStatus = z.infer<typeof GatewayLinkStatusSchema>
export type SettlementAccount = z.infer<typeof SettlementAccountSchema>
export type CreateSettlementAccount = z.infer<
  typeof CreateSettlementAccountSchema
>
export type UpdateSettlementAccount = z.infer<
  typeof UpdateSettlementAccountSchema
>
export type EditSettlementAccountForm = z.infer<
  typeof EditSettlementAccountFormSchema
>
export type ResolveAccount = z.infer<typeof ResolveAccountSchema>
export type ResolveAccountResponse = z.infer<
  typeof ResolveAccountResponseSchema
>
export type SplitType = z.infer<typeof SplitTypeSchema>
export type FeeBearer = z.infer<typeof FeeBearerSchema>
export type SplitEntry = z.infer<typeof SplitEntrySchema>
export type SplitRule = z.infer<typeof SplitRuleSchema>
export type UpsertSplitRule = z.infer<typeof UpsertSplitRuleSchema>
export type UpsertSplitRuleInput = z.input<typeof UpsertSplitRuleSchema>

/**
 * "live" — the proposed endpoint answered.
 * "fallback" — it 404/405'd (not built yet); data is an honest stand-in
 * (empty list, or the static offline bank list).
 */
export type DataSource = "live" | "fallback"

export interface Sourced<T> {
  data: T
  source: DataSource
}
