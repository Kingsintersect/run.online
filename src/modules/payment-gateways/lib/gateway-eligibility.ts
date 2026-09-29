import type { GatewayProvider, PaymentGateway } from "../types"
import { providerName } from "./provider-catalog"

export interface GatewayEligibility {
  eligible: boolean
  /** Why it can't be assigned (shown on the disabled option). */
  reason: string | null
}

/**
 * sandbox/payment-routing §3: a gateway can be assigned only when it is
 * enabled and has every required credential. This mirrors the server's own
 * 422 so the select can say why; the server still decides.
 */
export function gatewayEligibility(
  gateway: PaymentGateway,
  catalog: GatewayProvider[]
): GatewayEligibility {
  if (!gateway.isEnabled) return { eligible: false, reason: "disabled" }
  const provider = catalog.find((p) => p.provider === gateway.provider)
  const missing = (provider?.credentialFields ?? [])
    .filter((f) => f.required)
    .filter((f) => !gateway.credentials.find((c) => c.field === f.field)?.isSet)
  if (missing.length > 0) {
    return {
      eligible: false,
      reason: `missing ${missing.map((f) => f.label.toLowerCase()).join(", ")}`,
    }
  }
  return { eligible: true, reason: null }
}

export function gatewayLabel(
  gateways: PaymentGateway[],
  catalog: GatewayProvider[],
  id: number | null
): string | null {
  if (id === null) return null
  const gw = gateways.find((g) => g.id === id)
  if (!gw) return `Gateway #${id}`
  const name = providerName(catalog, gw.provider)
  return gw.displayName.toLowerCase().includes(name.toLowerCase())
    ? gw.displayName
    : `${gw.displayName} (${name})`
}

export function formatDateTime(value: string | null): string {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })
}
