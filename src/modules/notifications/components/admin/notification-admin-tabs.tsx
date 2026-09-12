"use client"

import { cn } from "@/lib/utils"
import { LayoutTemplate, Send } from "lucide-react"

export type NotificationAdminTab = "templates" | "send"

const TABS: {
  value: NotificationAdminTab
  label: string
  icon: React.ElementType
}[] = [
  { value: "templates", label: "Templates", icon: LayoutTemplate },
  { value: "send", label: "Send", icon: Send },
]

interface NotificationAdminTabsProps {
  active: NotificationAdminTab
  onChange: (tab: NotificationAdminTab) => void
}

export function NotificationAdminTabs({
  active,
  onChange,
}: NotificationAdminTabsProps) {
  return (
    <div className="flex w-fit gap-1 rounded-xl bg-muted p-1">
      {TABS.map(({ value, label, icon: Icon }) => {
        const isActive = active === value
        return (
          <button
            key={value}
            onClick={() => onChange(value)}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all",
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon size={14} />
            {label}
          </button>
        )
      })}
    </div>
  )
}
