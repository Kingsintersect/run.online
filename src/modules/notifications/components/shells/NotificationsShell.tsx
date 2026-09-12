"use client"

import { PermissionGate } from "@/lib/permissions/PermissionGate"
import { NotificationList } from "../NotificationList"

export function NotificationsShell() {
  return (
    <PermissionGate
      require={{ resource: "notifications", action: "view" }}
      denyBehavior="screen"
    >
      <NotificationList />
    </PermissionGate>
  )
}
