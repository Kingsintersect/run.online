"use client"

import { useMemo, useState } from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import {
  BookOpen,
  Building2,
  GraduationCap,
  Loader2,
  Monitor,
} from "lucide-react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { useAllPrograms } from "@/hooks/useCourseStructure"
import { useAcademicSessions } from "@/hooks/useAcademicSessions"
import { useSubmitProgramChoice } from "../hooks/useAdmissionQueries"
import type { EntryMode, StepSectionProps, StudyMode } from "../types/admission"

const ENTRY_MODES: { value: EntryMode; label: string }[] = [
  { value: "UTME", label: "UTME" },
  { value: "DIRECT_ENTRY", label: "Direct Entry" },
  { value: "TRANSFER", label: "Transfer" },
]

const STUDY_MODE_CARDS: {
  value: StudyMode
  label: string
  description: string
  icon: typeof Monitor
  disabled?: boolean
}[] = [
  {
    value: "online",
    label: "Online Learning",
    description:
      "Study remotely from anywhere. Access lectures, materials, and assessments online.",
    icon: Monitor,
  },
  {
    value: "offline",
    label: "On-Campus",
    description:
      "Attend classes in person at the university campus with face-to-face interactions.",
    icon: Building2,
    disabled: true,
  },
]

export function ChoiceProgramSection({ student, onRefresh }: StepSectionProps) {
  const {
    data: programsData,
    isLoading: isLoadingPrograms,
    isError: isProgramsError,
  } = useAllPrograms()
  const { data: sessions } = useAcademicSessions()
  const submitChoice = useSubmitProgramChoice()

  const activeSession = useMemo(
    () => sessions?.find((s) => s.isActive) ?? null,
    [sessions]
  )
  const startTerm = activeSession?.name ?? student.session

  const [programId, setProgramId] = useState<number | null>(student.program_id)
  const [entryMode, setEntryMode] = useState<EntryMode | "">(
    student.entry_mode ?? ""
  )
  const [studyMode, setStudyMode] = useState<StudyMode>(
    student.study_mode ?? "online"
  )

  const programOptions = (programsData?.data ?? []).map((p) => ({
    value: String(p.id),
    label: `${p.name} (${p.code})`,
  }))
  const noProgramsAvailable =
    !isLoadingPrograms && !isProgramsError && programOptions.length === 0

  const canSubmit = !!programId && !!entryMode

  const handleSubmit = async () => {
    if (!programId || !entryMode) {
      toast.error("Please select a program and entry mode to continue.")
      return
    }
    try {
      await submitChoice.mutateAsync({
        programId,
        entryMode,
        studyMode,
        startTerm,
      })
      toast.success("Program choice saved")
      onRefresh()
    } catch {
      toast.error(
        "Couldn't save your program choice. Please try again shortly."
      )
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <Card className="relative overflow-hidden border-border/50 shadow-lg">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/40 via-primary to-primary/40" />

        <CardHeader className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2.5 dark:bg-primary/20">
              <GraduationCap className="size-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Choose Your Program</CardTitle>
              <CardDescription>
                Select the program, entry mode, and study mode you&apos;re
                applying for before paying the application fee
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <Separator />

          <div className="space-y-2">
            <Label>
              Program <span className="text-destructive">*</span>
            </Label>
            <Select
              value={programId ? String(programId) : ""}
              onValueChange={(val) => setProgramId(Number(val))}
              disabled={
                isLoadingPrograms || isProgramsError || noProgramsAvailable
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={
                    isLoadingPrograms
                      ? "Loading programs…"
                      : isProgramsError
                        ? "Couldn't load programs"
                        : noProgramsAvailable
                          ? "No programs available"
                          : "Select a program"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {programOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isProgramsError && (
              <p className="text-sm text-destructive">
                Couldn&apos;t load the list of programs. Please refresh the page
                or contact the admissions office if this keeps happening.
              </p>
            )}
            {noProgramsAvailable && (
              <p className="text-sm text-muted-foreground">
                No programs have been set up for this institution yet. Please
                contact the admissions office.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>
              Entry Mode <span className="text-destructive">*</span>
            </Label>
            <Select
              value={entryMode}
              onValueChange={(val) => setEntryMode(val as EntryMode)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select your entry mode" />
              </SelectTrigger>
              <SelectContent>
                {ENTRY_MODES.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Start Term</Label>
            <Input value={startTerm} disabled className="disabled:opacity-70" />
          </div>

          <div className="space-y-3">
            <Label>
              Study Mode <span className="text-destructive">*</span>
            </Label>
            <div className="grid gap-4 sm:grid-cols-2">
              {STUDY_MODE_CARDS.map((mode) => {
                const Icon = mode.icon
                const isSelected = studyMode === mode.value

                return (
                  <button
                    key={mode.value}
                    type="button"
                    onClick={() => !mode.disabled && setStudyMode(mode.value)}
                    disabled={mode.disabled}
                    className={cn(
                      "relative flex flex-col items-start gap-3 rounded-xl border-2 p-5 text-left transition-all",
                      mode.disabled
                        ? "cursor-not-allowed border-border opacity-50"
                        : isSelected
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                          : "border-border hover:border-primary/30 hover:bg-muted/30"
                    )}
                  >
                    <div
                      className={cn(
                        "rounded-lg p-2.5",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}
                    >
                      <Icon className="size-5" />
                    </div>
                    <div>
                      <p className="font-semibold">{mode.label}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {mode.description}
                      </p>
                    </div>
                    {isSelected && (
                      <div className="ml-auto rounded-full bg-primary p-0.5">
                        <BookOpen className="size-3.5 text-primary-foreground" />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || submitChoice.isPending}
            className="btn-glow w-full gap-2"
            size="lg"
          >
            {submitChoice.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Continue to Application Fee"
            )}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  )
}
