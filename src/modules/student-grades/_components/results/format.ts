// Display formatting only — no grade arithmetic happens on the client.
// An absent or null score renders as "—", never as 0.
export function fmtScore(value: number | null | undefined): string {
  if (value == null) return "—"
  return Number.isInteger(value) ? String(value) : value.toFixed(2)
}

export function fmtSigned(value: number | null | undefined): string {
  if (value == null) return "—"
  if (value === 0) return "0"
  return `${value > 0 ? "+" : "−"}${fmtScore(Math.abs(value))}`
}

export function fmtPercent(value: number | null | undefined): string {
  return value == null ? "—" : `${fmtScore(value)}%`
}
