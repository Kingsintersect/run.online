import type { GatewayProvider } from "../types"

/**
 * Static provider catalog used only while `GET /payments/gateway-providers`
 * doesn't exist (sandbox/payment-routing API_CONTRACTS §1). The UI labels it
 * as a fallback. Field names match the Settings keys the server reads today
 * (`credo_public_key`, `fcmb_business_id`, …), so a credential saved here
 * lands in the row the backend actually uses.
 */
export const FALLBACK_PROVIDER_CATALOG: GatewayProvider[] = [
  {
    provider: "credo",
    name: "Credo",
    serverSupported: true,
    supportsSplit: true,
    splitTypes: ["PERCENTAGE", "FLAT"],
    credentialFields: [
      {
        field: "public_key",
        label: "Public key",
        secret: false,
        required: true,
        placeholder: "pk_live_…",
      },
      {
        field: "secret_key",
        label: "Secret key",
        secret: true,
        required: true,
        placeholder: "sk_live_…",
      },
      {
        field: "webhook_token",
        label: "Webhook token",
        secret: true,
        required: false,
      },
      {
        field: "base_url",
        label: "API base URL",
        secret: false,
        required: false,
        placeholder: "https://api.credocentral.com",
      },
    ],
  },
  {
    provider: "fcmb",
    name: "FCMB",
    serverSupported: true,
    // Unknown whether FCMB supports split settlement; treated as no.
    supportsSplit: false,
    splitTypes: [],
    credentialFields: [
      {
        field: "base_url",
        label: "API base URL",
        secret: false,
        required: true,
        placeholder: "https://…",
      },
      {
        field: "business_id",
        label: "Business ID",
        secret: false,
        required: true,
      },
      {
        field: "secret_key",
        label: "Secret key",
        secret: true,
        required: true,
      },
    ],
  },
  {
    provider: "flutterwave",
    name: "Flutterwave",
    serverSupported: false,
    supportsSplit: true,
    splitTypes: ["PERCENTAGE", "FLAT"],
    credentialFields: [
      {
        field: "public_key",
        label: "Public key",
        secret: false,
        required: true,
        placeholder: "FLWPUBK-…",
      },
      {
        field: "secret_key",
        label: "Secret key",
        secret: true,
        required: true,
        placeholder: "FLWSECK-…",
      },
      {
        field: "encryption_key",
        label: "Encryption key",
        secret: true,
        required: true,
      },
      {
        field: "webhook_hash",
        label: "Webhook secret hash",
        secret: true,
        required: false,
      },
    ],
  },
]

/** Provider name from a catalog, or a readable version of its slug. */
export function providerName(
  catalog: GatewayProvider[],
  provider: string
): string {
  const hit = catalog.find((p) => p.provider === provider)
  if (hit) return hit.name
  return provider.charAt(0).toUpperCase() + provider.slice(1)
}
