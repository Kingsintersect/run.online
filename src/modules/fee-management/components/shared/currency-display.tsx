import { cn } from "@/lib/utils"

// Matches the ₦ / en-NG / NGN convention used across the codebase
const nairaFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  minimumFractionDigits: 2,
})

interface CurrencyDisplayProps {
  /** Accepts string (API Decimal) or number */
  amount: string | number
  className?: string
}

export function CurrencyDisplay({ amount, className }: CurrencyDisplayProps) {
  const value = typeof amount === "string" ? Number(amount) : amount
  return (
    <span className={cn("tabular-nums", className)}>
      {nairaFormatter.format(value)}
    </span>
  )
}
