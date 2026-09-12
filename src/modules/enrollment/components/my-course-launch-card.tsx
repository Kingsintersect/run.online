"use client"

import { motion } from "framer-motion"
import { toast } from "sonner"
import { BookOpen, Clock, ExternalLink, Loader2, User } from "lucide-react"
import { useLaunchMoodleCourse } from "../hooks/use-enrollment-mutations"
import type { EnrollmentRecord } from "../types"

interface MyCourseLaunchCardProps {
  enrollment: EnrollmentRecord
  index?: number
}

export function MyCourseLaunchCard({
  enrollment,
  index = 0,
}: MyCourseLaunchCardProps) {
  const launch = useLaunchMoodleCourse()

  // `moodleSynced === false` is a definite "not mirrored on Moodle yet" —
  // undefined/null means unknown (flag not available), so keep it launchable.
  const notOnMoodle = enrollment.moodleSynced === false

  const handleOpen = () => {
    if (launch.isPending || notOnMoodle) return
    launch.mutate(enrollment.offeringId, {
      onSuccess: (result) => {
        window.location.href = result.redirectUrl
      },
      onError: () => {
        toast.error("This course isn't set up on Moodle yet — check back soon.")
      },
    })
  }

  return (
    <motion.button
      type="button"
      onClick={handleOpen}
      disabled={launch.isPending || notOnMoodle}
      title={notOnMoodle ? "This course isn't set up on Moodle yet" : undefined}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04 }}
      className="group flex cursor-pointer flex-col gap-3 rounded-2xl border border-border bg-card p-5 text-left transition-all duration-200 hover:border-primary/30 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-70"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
        <BookOpen size={18} className="text-primary" />
      </div>

      <div className="min-w-0">
        <p className="font-mono text-xs font-semibold text-primary">
          {enrollment.courseCode}
        </p>
        <h3 className="mt-0.5 line-clamp-2 text-sm leading-snug font-semibold text-foreground transition-colors group-hover:text-primary">
          {enrollment.courseTitle}
        </h3>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span>
          {enrollment.creditUnits} unit{enrollment.creditUnits !== 1 ? "s" : ""}
        </span>
        {enrollment.lecturerName && (
          <span className="flex items-center gap-1">
            <User size={12} />
            {enrollment.lecturerName}
          </span>
        )}
      </div>

      <div
        className={
          notOnMoodle
            ? "mt-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
            : "mt-1 flex items-center gap-1.5 text-xs font-medium text-primary"
        }
      >
        {notOnMoodle ? (
          <>
            <Clock size={13} />
            Not on Moodle yet
          </>
        ) : launch.isPending ? (
          <>
            <Loader2 size={13} className="animate-spin" />
            Opening…
          </>
        ) : (
          <>
            Continue on Moodle
            <ExternalLink
              size={12}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </>
        )}
      </div>
    </motion.button>
  )
}
