"use client"

import { motion } from "framer-motion"
import { Info, Settings, UserCircle2 } from "lucide-react"
import Link from "next/link"
import { useAppStore } from "@/store"

// GUEST is a limited/exploratory account type with no dedicated data module
// of its own (see roleDashboardPath/guestNav in nav.config.ts) — this page
// is deliberately minimal rather than wired to a backend module that
// doesn't exist for this role.
export default function GuestDashboardPage() {
  const user = useAppStore((s) => s.user)

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-1"
      >
        <h1 className="text-xl font-bold text-foreground">
          Welcome{user?.name ? `, ${user.name}` : ""}
        </h1>
        <p className="text-sm text-muted-foreground">
          You&apos;re signed in with limited, guest-level access.
        </p>
      </motion.div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-5">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <UserCircle2 size={18} className="text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Account</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {user?.email ?? "No email on file"}
            </p>
            <Link
              href="/guest/settings"
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
            >
              <Settings size={12} />
              Manage account settings
            </Link>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-5">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted">
            <Info size={18} className="text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              Limited access
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Guest accounts don&apos;t have access to academic, financial, or
              administrative records. Contact an administrator if you believe
              you should have a different role.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
