import { ApiClientError } from "@/lib/clients/apiClient"
import { ApiErrorBodySchema } from "../schemas"
import type { ApiErrorBody } from "../types"

// One place that turns a settlement/split API error into something a person
// can act on. Codes and shapes are from bruno/payment-routing:
//   502 NAME_ENQUIRY_UNAVAILABLE  resolve + create (by design, for now)
//   429                           resolve (10/min)
//   422 errors.<field>            create (accountNumber dup), upsert, update
//   409 ACCOUNT_IN_SPLIT_RULE     update isActive:false, delete (details.splitRuleIds)
//   409 SPLIT_RULE_EXISTS         upsert (details.splitRuleId)
//   403                           permission or OUT_OF_SCOPE, institution-wide create

/** What the caller was doing — picks the wording, never the classification. */
export type SettlementAction =
  | "verify-account"
  | "create-account"
  | "update-account"
  | "deactivate-account"
  | "delete-account"
  | "save-split-rule"
  | "delete-split-rule"

export type SettlementErrorKind =
  | "route-missing"
  | "name-enquiry-unavailable"
  | "rate-limited"
  | "forbidden"
  | "account-in-split-rule"
  | "split-rule-exists"
  | "validation"
  | "other"

export interface SettlementError {
  kind: SettlementErrorKind
  /** Ready-to-show sentence for this action. */
  message: string
  /** 422 `errors` (field key → messages), empty otherwise. */
  fieldErrors: Record<string, string[]>
  /** ACCOUNT_IN_SPLIT_RULE: ids of the rules that use the account. */
  splitRuleIds: number[]
  /** SPLIT_RULE_EXISTS: id of the rule that already covers the pair. */
  splitRuleId: number | null
}

export const NAME_ENQUIRY_UNAVAILABLE_MESSAGE =
  "The server can't verify bank account names yet: no confirmed payment-gateway name-enquiry endpoint exists. Until the backend wires one in, new settlement accounts can't be added."

const NOT_AVAILABLE_MESSAGE =
  "This isn't available on the server yet (sandbox/payment-routing). Nothing was saved."

const ACTION_VERB: Record<SettlementAction, string> = {
  "verify-account": "verify account names",
  "create-account": "add settlement accounts",
  "update-account": "change settlement accounts",
  "deactivate-account": "change settlement accounts",
  "delete-account": "delete settlement accounts",
  "save-split-rule": "save split rules",
  "delete-split-rule": "delete split rules",
}

const FALLBACK_MESSAGE: Record<SettlementAction, string> = {
  "verify-account": "Couldn't verify that account.",
  "create-account": "Failed to add settlement account.",
  "update-account": "Failed to update settlement account.",
  "deactivate-account": "Failed to deactivate settlement account.",
  "delete-account": "Failed to delete settlement account.",
  "save-split-rule": "Failed to save split rule.",
  "delete-split-rule": "Failed to delete split rule.",
}

/** Zod-parsed Laravel error body, or null when the error carries none. */
export function readApiErrorBody(error: Error): ApiErrorBody | null {
  if (!(error instanceof ApiClientError)) return null
  const parsed = ApiErrorBodySchema.safeParse(error.data)
  return parsed.success ? parsed.data : null
}

/** Laravel's unregistered-route 404, or a 405: the endpoint isn't built yet. */
export function isRouteMissing(error: ApiClientError): boolean {
  return (
    error.status === 405 ||
    (error.status === 404 &&
      /^The route .+ could not be found/i.test(error.message))
  )
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`
}

function accountInRuleMessage(action: SettlementAction, ids: number[]): string {
  const one = ids.length === 1
  const those = one ? "that rule" : "those rules"
  if (action === "delete-account") {
    const count =
      ids.length > 0
        ? plural(ids.length, "split rule", "split rules")
        : "at least one split rule"
    return `This account can't be deleted: it's used by ${count} (active or inactive). Remove it from ${those}, or delete ${one ? "it" : "them"}, first.`
  }
  const count =
    ids.length > 0
      ? plural(ids.length, "active split rule", "active split rules")
      : "at least one active split rule"
  return `This account can't be deactivated: it's used by ${count}. Remove it from ${those}, or deactivate ${one ? "it" : "them"}, first.`
}

/** Classify any error thrown by a settlement/split service call. */
export function classifySettlementError(
  error: Error,
  action: SettlementAction
): SettlementError {
  const body = readApiErrorBody(error)
  const status = error instanceof ApiClientError ? error.status : undefined
  const fieldErrors = body?.errors ?? {}
  const base: SettlementError = {
    kind: "other",
    message: body?.message ?? error.message ?? FALLBACK_MESSAGE[action],
    fieldErrors,
    splitRuleIds: body?.details?.splitRuleIds ?? [],
    splitRuleId: body?.details?.splitRuleId ?? null,
  }

  if (error instanceof ApiClientError && isRouteMissing(error)) {
    return { ...base, kind: "route-missing", message: NOT_AVAILABLE_MESSAGE }
  }

  if (body?.code === "NAME_ENQUIRY_UNAVAILABLE") {
    return {
      ...base,
      kind: "name-enquiry-unavailable",
      message:
        action === "verify-account"
          ? NAME_ENQUIRY_UNAVAILABLE_MESSAGE
          : `${NAME_ENQUIRY_UNAVAILABLE_MESSAGE} Nothing was saved; your details are still here.`,
    }
  }

  if (status === 429) {
    return {
      ...base,
      kind: "rate-limited",
      message: "Too many attempts. Wait a minute, then try again.",
    }
  }

  if (status === 403) {
    const outOfScope = body?.code === "OUT_OF_SCOPE"
    return {
      ...base,
      kind: "forbidden",
      message: outOfScope
        ? `You don't have permission to ${ACTION_VERB[action]} for this major program; it's outside your scope.`
        : `You don't have permission to ${ACTION_VERB[action]}.`,
    }
  }

  if (status === 409 && body?.code === "ACCOUNT_IN_SPLIT_RULE") {
    return {
      ...base,
      kind: "account-in-split-rule",
      message: accountInRuleMessage(action, base.splitRuleIds),
    }
  }

  if (status === 409 && body?.code === "SPLIT_RULE_EXISTS") {
    return {
      ...base,
      kind: "split-rule-exists",
      message:
        "An active rule already covers this program and fee type; edit that one instead.",
    }
  }

  if (status === 422) {
    const first = Object.values(fieldErrors).flat()[0]
    return {
      ...base,
      kind: "validation",
      message: first ?? body?.message ?? FALLBACK_MESSAGE[action],
    }
  }

  return base
}

/**
 * Split a 422 `errors` map into the keys a form can show on a field
 * (`resolvePath` returns the form path, or null) and the rest, joined into
 * one form-level message.
 */
export function partitionFieldErrors<P extends string>(
  fieldErrors: Record<string, string[]>,
  resolvePath: (key: string) => P | null
): { mapped: { path: P; message: string }[]; unmapped: string[] } {
  const mapped: { path: P; message: string }[] = []
  const unmapped: string[] = []
  for (const [key, messages] of Object.entries(fieldErrors)) {
    const message = messages[0]
    if (!message) continue
    const path = resolvePath(key)
    if (path) mapped.push({ path, message })
    else unmapped.push(message)
  }
  return { mapped, unmapped }
}
