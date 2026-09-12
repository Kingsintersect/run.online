"use client"

import { useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowLeft, Loader2, RefreshCw, UsersRound } from "lucide-react"
import { PermissionGate } from "@/lib/permissions/PermissionGate"
import { Button } from "@/components/ui/button"
import EmptyState from "@/components/custom/EmptyState"
import StatusBadge from "@/components/custom/StatusBadge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAllPrograms, useLevels } from "@/hooks/useCourseStructure"
import { useAcademicSessions } from "@/hooks/useAcademicSessions"
import {
  useSyncCohorts,
  usePushCohort,
  useSyncCohortMembers,
} from "@/modules/moodle-sync/hooks/use-sync-cohorts"

const STATUS_VARIANT: Record<
  string,
  "success" | "warning" | "destructive" | "default"
> = {
  SYNCED: "success",
  PENDING: "warning",
  FAILED: "destructive",
  STALE: "default",
}

// Multi-Program Platform — a cohort is Program + AcademicSession (+ Level),
// pushed to Moodle so shared courses can use "Cohort sync" for auto-enrol.
// Not yet shipped by the backend (sandbox/multi-program-platform/
// API_CONTRACTS.md §C) — the list/push/sync-members calls all degrade
// gracefully (empty state, toast on failure) until it lands.
export default function MoodleSyncCohortsPage() {
  const { data: cohorts, isLoading } = useSyncCohorts()
  const { data: programsRes } = useAllPrograms()
  const { data: sessions } = useAcademicSessions()
  const { data: levelsRes } = useLevels()
  const programs = programsRes?.data ?? []
  const levels = levelsRes?.data ?? []

  const pushCohort = usePushCohort()
  const syncMembers = useSyncCohortMembers()
  const [syncingId, setSyncingId] = useState<number | null>(null)

  const [programId, setProgramId] = useState("")
  const [academicSessionId, setAcademicSessionId] = useState("")
  const [levelId, setLevelId] = useState("")

  const handlePush = () => {
    if (!programId || !academicSessionId) return
    pushCohort.mutate({
      programId: Number(programId),
      academicSessionId: Number(academicSessionId),
      levelId: levelId ? Number(levelId) : undefined,
    })
  }

  const handleSyncMembers = (id: number) => {
    setSyncingId(id)
    syncMembers.mutate(id, { onSettled: () => setSyncingId(null) })
  }

  return (
    <PermissionGate
      require={{ resource: "moodle-sync", action: "view" }}
      denyBehavior="screen"
    >
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <Link
            href="/admin/moodle-sync"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft size={13} /> Back to Moodle Sync
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
              <UsersRound size={18} className="text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Cohorts</h1>
              <p className="text-xs text-muted-foreground">
                One cohort per program intake — students are added/removed
                automatically as they enroll or withdraw. Any Moodle course
                using &quot;Cohort sync&quot; as an enrolment method picks up
                the whole intake at once.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Push a new cohort */}
        <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground">
            Push a cohort
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Select value={programId} onValueChange={setProgramId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Program" />
              </SelectTrigger>
              <SelectContent>
                {programs.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name} ({p.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={academicSessionId}
              onValueChange={setAcademicSessionId}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Academic session" />
              </SelectTrigger>
              <SelectContent>
                {(sessions ?? []).map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={levelId} onValueChange={setLevelId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Level (optional)" />
              </SelectTrigger>
              <SelectContent>
                {levels.map((l) => (
                  <SelectItem key={l.id} value={String(l.id)}>
                    {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={handlePush}
              disabled={!programId || !academicSessionId || pushCohort.isPending}
            >
              {pushCohort.isPending && (
                <Loader2 size={14} className="animate-spin" />
              )}
              Push to Moodle
            </Button>
          </div>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-xl border border-border bg-muted/30"
              />
            ))}
          </div>
        ) : !cohorts?.length ? (
          <EmptyState
            icon={UsersRound}
            title="No cohorts yet"
            description="Push one above, or check back once the backend ships the cohort sync endpoints (sandbox/multi-program-platform/)."
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            {cohorts.map((c) => (
              <div
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4 last:border-0"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {c.name}
                  </p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {c.idnumber}
                    {c.levelName ? ` · ${c.levelName}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    {c.memberCount ?? 0} member
                    {c.memberCount === 1 ? "" : "s"}
                  </span>
                  <StatusBadge
                    label={c.syncStatus}
                    variant={STATUS_VARIANT[c.syncStatus] ?? "default"}
                    dot
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 text-xs"
                    disabled={syncingId === c.id}
                    onClick={() => handleSyncMembers(c.id)}
                    title="Reconcile membership against current enrollment"
                  >
                    {syncingId === c.id ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <RefreshCw size={12} />
                    )}
                    Sync members
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PermissionGate>
  )
}
