import { API_BASE_URL } from "@/config/global.config"
import { maskSecretValue, type SafeSetting } from "@/services/configurationApi"
import type {
  CredentialField,
  GatewayCredential,
  GatewayEnvironment,
  GatewayProvider,
  PaymentGateway,
} from "../types"

// Fallback for `GET /payments/gateways` (sandbox/payment-routing
// API_CONTRACTS §2): one "legacy" gateway per provider whose credentials are
// found in the Settings table today, keyed by prefix (`credo_*`, `fcmb_*`).
// Settings reach this file already through
// `toSafeSetting()`, and any field the catalog marks secret is masked here
// too, so a raw secret never gets further than the service layer.

/** The one webhook route every gateway posts to today. */
export const LEGACY_WEBHOOK_URL = `${API_BASE_URL}/fees/payments/webhook`

/** `sk_test_…` and `pk_test_…` mark a test key. */
const TEST_KEY = /^(?:sk|pk)_test_/i
/** A sandbox API host (e.g. `api.credodemo.com`, `dev.clnx.io`) also marks TEST. */
const TEST_HOST = /^https?:\/\/[^/]*(?:demo|sandbox|staging|\btest|\bdev\.)/i

export function settingKeyFor(provider: string, field: string): string {
  return `${provider}_${field}`
}

/** Settings rows for one provider, keyed by credential field. */
export function providerSettingRows(
  settings: SafeSetting[],
  provider: string
): Map<string, SafeSetting> {
  const prefix = `${provider}_`
  const rows = new Map<string, SafeSetting>()
  for (const s of settings) {
    if (s.key.startsWith(prefix)) rows.set(s.key.slice(prefix.length), s)
  }
  return rows
}

function humanise(field: string): string {
  const text = field.replace(/_/g, " ")
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function toCredential(
  field: Pick<CredentialField, "field" | "label" | "secret">,
  row: SafeSetting | undefined
): GatewayCredential {
  if (!row) {
    return {
      field: field.field,
      label: field.label,
      secret: field.secret,
      isSet: false,
      maskedValue: null,
      value: null,
    }
  }
  const secret = field.secret || row.isSecret
  if (!secret) {
    const value = row.value ?? ""
    return {
      field: field.field,
      label: field.label,
      secret: false,
      isSet: value !== "",
      maskedValue: null,
      value,
    }
  }
  if (row.isSecret) {
    return {
      field: field.field,
      label: field.label,
      secret: true,
      isSet: row.isSet,
      maskedValue: row.maskedValue,
      value: null,
    }
  }
  // The catalog calls it secret but the key heuristic didn't: mask it here
  // instead.
  const plain = row.value ?? ""
  return {
    field: field.field,
    label: field.label,
    secret: true,
    isSet: plain !== "",
    maskedValue: plain ? maskSecretValue(plain) : null,
    value: null,
  }
}

function inferEnvironment(
  credentials: GatewayCredential[]
): GatewayEnvironment {
  return credentials.some((c) => {
    const v = c.value ?? c.maskedValue ?? ""
    return TEST_KEY.test(v) || TEST_HOST.test(v)
  })
    ? "TEST"
    : "LIVE"
}

function edgeDate(rows: SafeSetting[], pick: "min" | "max"): string | null {
  const times = rows
    .map((r) => (pick === "min" ? r.createdAt : r.updatedAt))
    .filter((t): t is string => typeof t === "string" && t !== "")
    .sort()
  if (times.length === 0) return null
  return pick === "min" ? times[0] : times[times.length - 1]
}

/** Synthetic id for a derived gateway: negative, stable per catalog slot. */
export function legacyGatewayId(
  catalog: GatewayProvider[],
  provider: string
): number {
  return -(catalog.findIndex((p) => p.provider === provider) + 1)
}

export function deriveGatewaysFromSettings(
  settings: SafeSetting[],
  catalog: GatewayProvider[]
): PaymentGateway[] {
  const gateways: PaymentGateway[] = []
  for (const provider of catalog) {
    const rows = providerSettingRows(settings, provider.provider)
    if (rows.size === 0) continue

    const known = new Set(provider.credentialFields.map((f) => f.field))
    const credentials = [
      ...provider.credentialFields.map((f) =>
        toCredential(f, rows.get(f.field))
      ),
      // Rows the catalog doesn't list (e.g. a business code) are still shown.
      ...[...rows.entries()]
        .filter(([field]) => !known.has(field))
        .map(([field, row]) =>
          toCredential({ field, label: humanise(field), secret: false }, row)
        ),
    ]
    const requiredSet = provider.credentialFields
      .filter((f) => f.required)
      .every((f) => credentials.find((c) => c.field === f.field)?.isSet)

    const rowList = [...rows.values()]
    gateways.push({
      id: legacyGatewayId(catalog, provider.provider),
      provider: provider.provider,
      displayName: `${provider.name} (from Settings)`,
      environment: inferEnvironment(credentials),
      isEnabled: requiredSet,
      credentials,
      webhookUrl: LEGACY_WEBHOOK_URL,
      health: { status: "UNKNOWN", checkedAt: null, message: null },
      assignedMajorProgramIds: [],
      createdAt: edgeDate(rowList, "min"),
      updatedAt: edgeDate(rowList, "max"),
    })
  }
  return gateways
}
