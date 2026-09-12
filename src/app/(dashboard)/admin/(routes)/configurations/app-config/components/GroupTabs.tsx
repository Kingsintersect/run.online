"use client"

import { cn } from "@/lib/utils"
import {
  Building2,
  GraduationCap,
  CreditCard,
  BookOpen,
  Settings2,
  LucideIcon,
} from "lucide-react"
import type { SettingGroup } from "@/types/school"

export const SETTING_GROUPS: {
  value: SettingGroup | "all"
  label: string
  icon: LucideIcon
  description: string
}[] = [
  {
    value: "all",
    label: "All Settings",
    icon: Settings2,
    description: "View all configuration entries",
  },
  {
    value: "university",
    label: "University",
    icon: Building2,
    description: "Name, logo, motto, contact info",
  },
  {
    value: "academic",
    label: "Academic",
    icon: GraduationCap,
    description: "Credit limits, grading, attendance",
  },
  {
    value: "payment",
    label: "Payment",
    icon: CreditCard,
    description: "Fees, gateway keys",
  },
  {
    value: "moodle",
    label: "Moodle",
    icon: BookOpen,
    description: "LMS integration settings",
  },
  {
    value: "system",
    label: "System",
    icon: Settings2,
    description: "Maintenance mode, version info",
  },
]

interface GroupTabsProps {
  active: SettingGroup | "all"
  onChange: (group: SettingGroup | "all") => void
  counts?: Partial<Record<SettingGroup | "all", number>>
}

export function GroupTabs({ active, onChange, counts }: GroupTabsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {SETTING_GROUPS.map(({ value, label, icon: Icon }) => {
        const isActive = active === value
        const count = counts?.[value]
        return (
          <button
            key={value}
            onClick={() => onChange(value)}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium transition-all",
              isActive
                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <Icon size={14} />
            {label}
            {count !== undefined && (
              <span
                className={cn(
                  "inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-full px-1 text-[10px] font-semibold",
                  isActive
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
