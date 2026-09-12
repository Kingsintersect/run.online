"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ShieldAlert } from "lucide-react"
import { useAppStore } from "@/store"
import { roleDashboardPath } from "@/config/nav.config"

interface PermissionDeniedScreenProps {
  /** Resource name to build a default message from, e.g. "fee-management". */
  resource?: string
  /** Overrides the auto-generated message entirely. */
  message?: string
  /** Seconds before auto-redirecting to the user's own dashboard. */
  seconds?: number
}

function humanizeResource(resource: string): string {
  return resource.replace(/[-_]/g, " ")
}

export function PermissionDeniedScreen({
  resource,
  message,
  seconds = 5,
}: PermissionDeniedScreenProps) {
  const router = useRouter()
  const activeRole = useAppStore((s) => s.activeRole)
  const [secondsLeft, setSecondsLeft] = useState(seconds)

  const destination = activeRole
    ? roleDashboardPath[activeRole]
    : "/auth/signin"

  useEffect(() => {
    if (secondsLeft <= 0) {
      router.replace(destination)
      return
    }
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [secondsLeft, router, destination])

  const description =
    message ??
    (resource
      ? `You don't have permission to view ${humanizeResource(resource)}.`
      : "You don't have permission to view this page.")

  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-5 rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-destructive/10">
          <ShieldAlert className="size-7 text-destructive" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-lg font-semibold text-foreground">
            Access Restricted
          </h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="space-y-2">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-1000 ease-linear"
              style={{ width: `${(secondsLeft / seconds) * 100}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Taking you to your dashboard in {secondsLeft}s…
          </p>
        </div>
      </div>
    </div>
  )
}
