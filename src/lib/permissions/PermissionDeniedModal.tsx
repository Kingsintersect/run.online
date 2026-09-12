"use client"

import { useRouter } from "next/navigation"
import { ShieldAlert } from "lucide-react"
import Modal from "@/components/custom/Modal"
import { Button } from "@/components/ui/button"
import { useAppStore } from "@/store"
import { roleDashboardPath } from "@/config/nav.config"

interface PermissionDeniedModalProps {
  /** Resource name to build a default message from, e.g. "fee-management". */
  resource?: string
  /** Overrides the auto-generated message entirely. */
  message?: string
}

function humanizeResource(resource: string): string {
  return resource.replace(/[-_]/g, " ")
}

export function PermissionDeniedModal({
  resource,
  message,
}: PermissionDeniedModalProps) {
  const router = useRouter()
  const activeRole = useAppStore((s) => s.activeRole)

  const destination = activeRole
    ? roleDashboardPath[activeRole]
    : "/auth/signin"
  const leave = () => router.replace(destination)

  const description =
    message ??
    (resource
      ? `You don't have permission to manage ${humanizeResource(resource)}.`
      : "You don't have permission to manage this content.")

  return (
    <Modal open onClose={leave} title="Access Restricted" size="sm">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
          <ShieldAlert className="size-6 text-destructive" />
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
        <Button className="w-full" onClick={leave}>
          Return to Dashboard
        </Button>
      </div>
    </Modal>
  )
}
