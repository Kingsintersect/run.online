"use client"

import { useState } from "react"
import { Edit2, Trash2, Eye, EyeOff, Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import StatusBadge from "@/components/custom/StatusBadge"
import type { Setting } from "@/types/school"

// ── Sensitive key detection ──────────────────
const SENSITIVE_KEYS = ["gateway_key", "api_token", "password", "secret"]
const isSensitive = (key: string) =>
  SENSITIVE_KEYS.some((k) => key.toLowerCase().includes(k))

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

// ── Copy-to-clipboard cell ──────────────────

function CopyableValue({
  value,
  sensitive,
}: {
  value: string
  sensitive: boolean
}) {
  const [visible, setVisible] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const display =
    sensitive && !visible ? "•".repeat(Math.min(value.length, 12)) : value

  return (
    <div className="flex min-w-0 items-center gap-2">
      <span
        className="max-w-65 truncate font-mono text-xs text-foreground"
        title={sensitive && !visible ? undefined : value}
      >
        {display}
      </span>
      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover/row:opacity-100">
        {sensitive && (
          <button
            onClick={() => setVisible((v) => !v)}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title={visible ? "Hide" : "Reveal"}
          >
            {visible ? <EyeOff size={12} /> : <Eye size={12} />}
          </button>
        )}
        <button
          onClick={handleCopy}
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          title="Copy value"
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
  settings: Setting[]
  showGroupColumn?: boolean
  onEdit: (setting: Setting) => void
  onDelete: (setting: Setting) => void
}

export function SettingsTable({
  settings,
  showGroupColumn = false,
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
            const sensitive = isSensitive(setting.key)
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
                  <CopyableValue value={setting.value} sensitive={sensitive} />
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
                  <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover/row:opacity-100">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7"
                      onClick={() => onEdit(setting)}
                      title="Edit"
                    >
                      <Edit2 size={13} />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => onDelete(setting)}
                      title="Delete"
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
