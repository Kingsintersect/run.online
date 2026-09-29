// Split rule maths — sandbox/payment-routing (CONTRACT §5). Pure functions,
// no React, no network: used by the Zod schema (rule-level validation) and by
// the live preview panel (per-amount shares). Works identically in fallback
// mode because nothing here depends on the backend.
//
// All money is computed in integer kobo so shares never drift by floating
// point error. Percentage shares are floored to the kobo; the rounding
// difference always lands on the default ("receives remainder") entry, which
// is exactly how Credo treats its default subaccount.

export type SplitType = "PERCENTAGE" | "FLAT"

export interface SplitEntryInput {
  settlementAccountId: number
  splitType: SplitType
  value: number
  isDefault: boolean
}

export type SplitIssueCode =
  | "NO_ENTRIES"
  | "NO_DEFAULT"
  | "MULTIPLE_DEFAULTS"
  | "MISSING_ACCOUNT"
  | "DUPLICATE_ACCOUNT"
  | "PERCENT_OUT_OF_RANGE"
  | "PERCENT_TOTAL_OVER_100"
  | "FLAT_NOT_POSITIVE"
  | "FLAT_TOO_PRECISE"
  | "INVALID_AMOUNT"
  | "EXCEEDS_AMOUNT"

export interface SplitIssue {
  code: SplitIssueCode
  message: string
  /** Index of the offending entry, when the issue belongs to one entry. */
  entryIndex?: number
  /** Which field of that entry, for form error placement. */
  field?: "settlementAccountId" | "value" | "isDefault"
}

export interface SplitShare {
  entryIndex: number
  settlementAccountId: number
  splitType: SplitType
  value: number
  isDefault: boolean
  /** Share in kobo (integer). */
  kobo: number
  /** Share in naira (kobo / 100). */
  amount: number
}

export interface SplitResult {
  amountKobo: number
  shares: SplitShare[]
  /** Sum of the non-default entries, in kobo. */
  allocatedKobo: number
  /** What the default entry receives, in kobo (0 when over-allocated). */
  remainderKobo: number
  issues: SplitIssue[]
}

const EPSILON = 1e-9

export function toKobo(naira: number): number {
  return Math.round(naira * 100)
}

export function fromKobo(kobo: number): number {
  return kobo / 100
}

function hasMoreThanTwoDecimals(value: number): boolean {
  return Math.abs(value * 100 - Math.round(value * 100)) > 1e-6
}

/**
 * Rule-level validation (independent of any payment amount) — the same
 * rules the server enforces on `PUT /payments/split-rules`.
 */
export function validateSplitEntries(
  entries: readonly SplitEntryInput[]
): SplitIssue[] {
  const issues: SplitIssue[] = []

  if (entries.length === 0) {
    issues.push({ code: "NO_ENTRIES", message: "Add at least one account." })
    return issues
  }

  const defaults = entries.filter((e) => e.isDefault).length
  if (defaults === 0) {
    issues.push({
      code: "NO_DEFAULT",
      message: "Choose exactly one account to receive the remainder.",
    })
  } else if (defaults > 1) {
    issues.push({
      code: "MULTIPLE_DEFAULTS",
      message: "Only one account can receive the remainder.",
    })
  }

  const seen = new Map<number, number>()
  let percentTotal = 0

  entries.forEach((entry, index) => {
    if (!entry.settlementAccountId || entry.settlementAccountId <= 0) {
      issues.push({
        code: "MISSING_ACCOUNT",
        message: "Choose an account.",
        entryIndex: index,
        field: "settlementAccountId",
      })
    } else if (seen.has(entry.settlementAccountId)) {
      issues.push({
        code: "DUPLICATE_ACCOUNT",
        message: "This account is already used in this rule.",
        entryIndex: index,
        field: "settlementAccountId",
      })
    } else {
      seen.set(entry.settlementAccountId, index)
    }

    // The default entry's value is ignored — it receives whatever is left.
    if (entry.isDefault) return

    const value = Number.isFinite(entry.value) ? entry.value : NaN

    if (entry.splitType === "PERCENTAGE") {
      if (!(value > 0) || value > 100) {
        issues.push({
          code: "PERCENT_OUT_OF_RANGE",
          message: "A percentage must be more than 0 and at most 100.",
          entryIndex: index,
          field: "value",
        })
      } else {
        percentTotal += value
      }
    } else if (!(value > 0)) {
      issues.push({
        code: "FLAT_NOT_POSITIVE",
        message: "An exact amount must be more than ₦0.",
        entryIndex: index,
        field: "value",
      })
    } else if (hasMoreThanTwoDecimals(value)) {
      issues.push({
        code: "FLAT_TOO_PRECISE",
        message: "Use at most 2 decimal places (kobo).",
        entryIndex: index,
        field: "value",
      })
    }
  })

  if (percentTotal > 100 + EPSILON) {
    issues.push({
      code: "PERCENT_TOTAL_OVER_100",
      message: `Percentages add up to ${Number(percentTotal.toFixed(4))}%, which is over 100%.`,
    })
  }

  return issues
}

/**
 * Each entry's share of a payment of `amount` naira. Always returns shares
 * (so the preview can render something), plus every issue found — including
 * `EXCEEDS_AMOUNT`, the check the server applies at payment time
 * (422 SPLIT_EXCEEDS_AMOUNT).
 */
export function calculateSplit(
  amount: number,
  entries: readonly SplitEntryInput[]
): SplitResult {
  const issues = validateSplitEntries(entries)
  const amountKobo = Number.isFinite(amount) ? toKobo(amount) : 0

  if (!(amountKobo > 0)) {
    issues.push({
      code: "INVALID_AMOUNT",
      message: "Enter a sample payment amount above ₦0.",
    })
  }

  const shares: SplitShare[] = entries.map((entry, entryIndex) => {
    let kobo = 0
    if (!entry.isDefault && Number.isFinite(entry.value) && entry.value > 0) {
      kobo =
        entry.splitType === "PERCENTAGE"
          ? Math.floor((amountKobo * entry.value) / 100 + 1e-6)
          : toKobo(entry.value)
    }
    return {
      entryIndex,
      settlementAccountId: entry.settlementAccountId,
      splitType: entry.splitType,
      value: entry.value,
      isDefault: entry.isDefault,
      kobo,
      amount: fromKobo(kobo),
    }
  })

  const allocatedKobo = shares.reduce(
    (sum, s) => (s.isDefault ? sum : sum + s.kobo),
    0
  )
  const rawRemainder = amountKobo - allocatedKobo
  const remainderKobo = Math.max(0, rawRemainder)

  if (amountKobo > 0 && rawRemainder < 0) {
    issues.push({
      code: "EXCEEDS_AMOUNT",
      message: `The fixed and percentage shares total ₦${fromKobo(allocatedKobo).toLocaleString("en-NG", { minimumFractionDigits: 2 })}, more than the ₦${fromKobo(amountKobo).toLocaleString("en-NG", { minimumFractionDigits: 2 })} payment. The server would reject this payment (SPLIT_EXCEEDS_AMOUNT).`,
    })
  }

  // Only the first default entry receives the remainder (a second default
  // is already reported as MULTIPLE_DEFAULTS).
  const firstDefault = shares.find((s) => s.isDefault)
  if (firstDefault) {
    firstDefault.kobo = remainderKobo
    firstDefault.amount = fromKobo(remainderKobo)
  }

  return { amountKobo, shares, allocatedKobo, remainderKobo, issues }
}
