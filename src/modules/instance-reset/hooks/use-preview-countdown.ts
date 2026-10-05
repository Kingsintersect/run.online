"use client"

import { useEffect, useState } from "react"

/** Seconds left until `expiresAt` (0 once passed), ticking every second. */
export function usePreviewCountdown(expiresAt: string | null): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!expiresAt) return
    const t = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [expiresAt])
  if (!expiresAt) return 0
  const deadline = new Date(expiresAt).getTime()
  if (Number.isNaN(deadline)) return 0
  return Math.max(0, Math.floor((deadline - now) / 1000))
}
