"use client"

import { useState } from "react"
import { Edit2, Trash2, Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import StatusBadge from "@/components/custom/StatusBadge"
import type { SafeSetting } from "@/services/configurationApi"
import { SecretValue } from "./SecretValue"

// ── Group badge color mapping ─────────────────
const GROUP_VARIANTS: Record<
  string,
  "info" | "success" | "warning" | "purple" | "orange" | "default"
> = {
  university: "info",
  academic: "success",
  payment: "warning",
  moodle: "purple",
  system: "orange",
}

// ── Copy-to-clipboard cell (plain settings only) ──────────
// Secret settings never reach this cell: their value is dropped in the
// service layer (toSafeSetting) and they render through <SecretValue>.

function CopyableValue({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="flex min-w-0 items-center gap-2">
      <span
        className="max-w-65 truncate font-mono text-xs text-foreground"
        title={value}
      >
        {value}
      </span>
      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover/row:opacity-100 focus-within:opacity-100">
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          title="Copy value"
          aria-label="Copy value"
        >
          {copied ? (
            <Check size={12} className="text-emerald-500" />
          ) : (
            <Copy size={12} />
          )}
        </button>
      </div>
    </div>
  )
}

// ── Main table ───────────────────────────────

interface SettingsTableProps {
  settings: SafeSetting[]
  showGroupColumn?: boolean
  /** Show View / Copy on secret settings (super admin only). */
  canRevealSecrets?: boolean
  onEdit: (setting: SafeSetting) => void
  onDelete: (setting: SafeSetting) => void
}

export function SettingsTable({
  settings,
  showGroupColumn = false,
  canRevealSecrets = false,
  onEdit,
  onDelete,
}: SettingsTableProps) {
  if (settings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-sm text-muted-foreground">
          No settings found in this group.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {`Click "Add Setting" to create the first entry.`}
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="w-60 px-4 py-3 text-left text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Key
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Value
            </th>
            {showGroupColumn && (
              <th className="w-30 px-4 py-3 text-left text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Group
              </th>
            )}
            <th className="w-45 px-4 py-3 text-left text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Last Updated
            </th>
            <th className="w-20" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {settings.map((setting) => {
            return (
              <tr
                key={setting.id}
                className="group/row transition-colors hover:bg-accent/40"
              >
                {/* Key */}
                <td className="px-4 py-3">
                  <span className="font-mono text-xs font-medium text-foreground">
                    {setting.key}
                  </span>
                </td>

                {/* Value */}
                <td className="px-4 py-3">
                  {setting.isSecret ? (
                    <SecretValue
                      setting={setting}
                      canReveal={canRevealSecrets}
                    />
                  ) : (
                    <CopyableValue value={setting.value ?? ""} />
                  )}
                </td>

                {/* Group (optional) */}
                {showGroupColumn && (
                  <td className="px-4 py-3">
                    <StatusBadge
                      label={setting.group}
                      variant={GROUP_VARIANTS[setting.group] ?? "default"}
                    />
                  </td>
                )}

                {/* Updated at */}
                <td className="px-4 py-3 text-xs whitespace-nowrap text-muted-foreground">
                  {new Date(setting.updatedAt).toLocaleString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>

                {/* Actions */}
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover/row:opacity-100 focus-within:opacity-100">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7"
                      onClick={() => onEdit(setting)}
                      title="Edit"
                      aria-label={`Edit ${setting.key}`}
                    >
                      <Edit2 size={13} />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => onDelete(setting)}
                      title="Delete"
                      aria-label={`Delete ${setting.key}`}
                    >
                      <Trash2 size={13} />
                    </Button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
