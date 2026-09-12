"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight, LucideIcon, Sparkles } from "lucide-react"
import { useAppStore } from "@/store"

interface StatItem {
  title: string
  value: string | number
  detail: string
  icon: LucideIcon
  tone: string
}

interface FocusItem {
  title: string
  meta: string
  description: string
  status: string
  tone: string
}

interface QuickActionItem {
  title: string
  href: string
  description: string
  icon: LucideIcon
  tone: string
}

interface SignalItem {
  label: string
  value: string
  // Optional — most of these are real point-in-time ratios with no
  // historical snapshot anywhere to diff a "vs last period" change
  // against; omit rather than fabricate one.
  change?: string
}

interface RoleDashboardProps {
  eyebrow: string
  title: string
  subtitle: string
  accent: string
  stats: StatItem[]
  focusTitle: string
  focusItems: FocusItem[]
  quickActions: QuickActionItem[]
  signalsTitle: string
  signals: SignalItem[]
}

function Greeting() {
  const { user } = useAppStore()
  const firstName = user?.name.split(" ")[0] ?? "there"
  const hour = new Date().getHours()
  const salutation =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"

  return (
    <div>
      <p className="text-sm font-medium text-primary">
        {salutation}, {firstName}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        {user?.department ? `${user.department} team` : "Portal operations"}
        {user?.faculty ? ` · ${user.faculty}` : ""}
      </p>
    </div>
  )
}

export default function RoleDashboard({
  eyebrow,
  title,
  subtitle,
  accent,
  stats,
  focusTitle,
  focusItems,
  quickActions,
  signalsTitle,
  signals,
}: RoleDashboardProps) {
  return (
    <div className="space-y-8">
      <motion.section
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28 }}
        className={`relative overflow-hidden rounded-[2rem] border border-border/70 bg-linear-to-br ${accent} p-6 shadow-sm lg:p-8`}
      >
        <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.28),transparent_55%)]" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-4">
            <Greeting />
            <div>
              <p className="text-xs font-semibold tracking-[0.24em] text-primary/80 uppercase">
                {eyebrow}
              </p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground lg:text-4xl">
                {title}
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground lg:text-base">
                {subtitle}
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/40 bg-background/70 p-4 backdrop-blur-sm">
              <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
                Focus Window
              </p>
              <p className="mt-2 text-lg font-semibold text-foreground">
                08:00 - 14:00
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Highest operational load across the portal
              </p>
            </div>
            <div className="rounded-2xl border border-white/40 bg-background/70 p-4 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-primary">
                <Sparkles size={14} />
                <p className="text-xs font-medium tracking-[0.18em] uppercase">
                  Daily Pulse
                </p>
              </div>
              <p className="mt-2 text-lg font-semibold text-foreground">
                Stable and on schedule
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                No blockers reported by the latest workflow checks
              </p>
            </div>
          </div>
        </div>
      </motion.section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon

          return (
            <motion.article
              key={stat.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="rounded-2xl border border-border bg-card p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    {stat.title}
                  </p>
                  <p className="mt-2 text-3xl font-bold text-card-foreground">
                    {stat.value}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {stat.detail}
                  </p>
                </div>
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-2xl ${stat.tone}`}
                >
                  <Icon size={18} />
                </div>
              </div>
            </motion.article>
          )
        })}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.7fr_1fr]">
        <div className="rounded-[1.75rem] border border-border bg-card p-5 shadow-sm lg:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-card-foreground">
                {focusTitle}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                The most important work streams for this dashboard right now.
              </p>
            </div>
            <div className="hidden rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary sm:block">
              {focusItems.length} live items
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {focusItems.map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + index * 0.06 }}
                className="rounded-2xl border border-border/70 bg-muted/30 p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-card-foreground">
                        {item.title}
                      </h3>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${item.tone}`}
                      >
                        {item.status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs font-medium text-primary">
                      {item.meta}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[1.75rem] border border-border bg-card p-5 shadow-sm lg:p-6">
            <h2 className="text-lg font-semibold text-card-foreground">
              Quick Actions
            </h2>
            <div className="mt-5 space-y-3">
              {quickActions.map((action, index) => {
                const Icon = action.icon

                return (
                  <motion.div
                    key={action.title}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 + index * 0.05 }}
                  >
                    <Link
                      href={action.href}
                      className="group flex items-center gap-4 rounded-2xl border border-border/70 bg-muted/25 p-4 transition hover:-translate-y-0.5 hover:bg-muted/45"
                    >
                      <div
                        className={`flex h-11 w-11 items-center justify-center rounded-2xl ${action.tone}`}
                      >
                        <Icon size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-card-foreground">
                          {action.title}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {action.description}
                        </p>
                      </div>
                      <ArrowRight
                        size={16}
                        className="text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary"
                      />
                    </Link>
                  </motion.div>
                )
              })}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-border bg-card p-5 shadow-sm lg:p-6">
            <h2 className="text-lg font-semibold text-card-foreground">
              {signalsTitle}
            </h2>
            <div className="mt-5 space-y-4">
              {signals.map((signal) => (
                <div key={signal.label} className="rounded-2xl bg-muted/30 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm font-medium text-card-foreground">
                      {signal.label}
                    </p>
                    {signal.change && (
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        {signal.change}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-2xl font-bold text-card-foreground">
                    {signal.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
