"use client"

import { Moon, Sun, UserCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useAppStore, useThemeStore } from "@/store"

// Deliberately minimal — GUEST has no editable profile fields on the
// backend (no self-registration profile endpoint for this role), so this
// is read-only account info plus the one thing every role can control
// purely client-side: theme.
export default function GuestSettingsPage() {
  const user = useAppStore((s) => s.user)
  const theme = useThemeStore((s) => s.theme)
  const toggleTheme = useThemeStore((s) => s.toggle)

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-xl font-bold text-foreground">Account Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Basic account information and preferences.
        </p>
      </div>

      <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <UserCircle2 size={18} className="text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              {user?.name ?? "Guest"}
            </p>
            <p className="text-xs text-muted-foreground">
              {user?.email ?? "No email on file"}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
        <Label>Appearance</Label>
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Switch between light and dark mode.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleTheme}
            className="gap-1.5"
          >
            {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </Button>
        </div>
      </div>
    </div>
  )
}
