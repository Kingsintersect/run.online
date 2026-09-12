"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { CheckCircle2, Circle, Loader2, Sparkles } from "lucide-react"
import { useMyLecturer } from "@/hooks/use-my-lecturer-id"
import { useUpdateMyOnboarding } from "../hooks/useUsersData"
import type { TutorOnboardingStep } from "@/types/users"

const STEPS: {
  key: TutorOnboardingStep
  label: string
  hint: string
  href: string
}[] = [
  {
    key: "profileConfirmed",
    label: "Confirm your profile",
    hint: "Check your name, department and contact details are right.",
    href: "/tutor/settings",
  },
  {
    key: "coursesConfirmed",
    label: "Review your assigned courses",
    hint: "Make sure the courses you're teaching this semester look correct.",
    href: "/tutor/courses",
  },
  {
    key: "firstAnnouncementPosted",
    label: "Post your first announcement",
    hint: "Say hello to your students and set expectations for the term.",
    href: "/tutor/notifications",
  },
]

// First-login checklist for a newly-onboarded tutor. Backed by
// PATCH /users/lecturers/me/onboarding — see tutor_onboarding_workflow.md §5.
// Renders nothing once every step is done.
export function TutorOnboardingChecklist() {
  const { lecturer } = useMyLecturer()
  const update = useUpdateMyOnboarding()

  if (!lecturer || lecturer.onboarding_complete) return null

  const progress = lecturer.onboarding_progress
  const doneCount = STEPS.filter((s) => progress[s.key]).length

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border border-primary/25 bg-linear-to-br from-primary/10 via-background to-sky-500/5 p-5"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
          <Sparkles size={17} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground">
            Finish setting up your account
          </p>
          <p className="text-xs text-muted-foreground">
            {doneCount} of {STEPS.length} done
          </p>
        </div>
      </div>

      <ul className="mt-4 space-y-2">
        {STEPS.map((step) => {
          const done = progress[step.key]
          const pending = update.isPending && update.variables === step.key
          return (
            <li
              key={step.key}
              className="flex items-start gap-3 rounded-2xl border border-border/70 bg-card/70 p-3"
            >
              <button
                type="button"
                disabled={done || update.isPending}
                onClick={() => update.mutate(step.key)}
                title={done ? "Completed" : "Mark done"}
                className="mt-0.5 shrink-0 text-primary disabled:cursor-default"
              >
                {pending ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : done ? (
                  <CheckCircle2 size={18} className="text-emerald-500" />
                ) : (
                  <Circle size={18} className="text-muted-foreground" />
                )}
              </button>
              <div className="min-w-0 flex-1">
                <p
                  className={
                    "text-sm font-medium " +
                    (done
                      ? "text-muted-foreground line-through"
                      : "text-foreground")
                  }
                >
                  {step.label}
                </p>
                <p className="text-xs text-muted-foreground">{step.hint}</p>
              </div>
              {!done && (
                <Link
                  href={step.href}
                  className="shrink-0 self-center text-xs font-semibold text-primary hover:underline"
                >
                  Go
                </Link>
              )}
            </li>
          )
        })}
      </ul>
    </motion.div>
  )
}
