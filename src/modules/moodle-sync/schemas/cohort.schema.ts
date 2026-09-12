import { z } from "zod"
import { SyncStatusSchema } from "./common.schema"

// Multi-Program Platform — Moodle-native cohort sync. A cohort is not a new
// concept: it's Program + AcademicSession (+ Level), pushed to Moodle as a
// real cohort so shared courses can use Moodle's own "Cohort sync"
// enrolment method for auto-enrol/auto-unenrol. Same idnumber-keyed mapping
// pattern as CategorySyncResponse. Backend not yet shipped — see
// sandbox/multi-program-platform/{SCHEMA_CHANGES,API_CONTRACTS,
// MOODLE_COHORT_SYNC}.md.
export const CohortSyncResponseSchema = z.object({
  id: z.number(),
  programId: z.number(),
  programName: z.string(),
  academicSessionId: z.number(),
  academicSessionName: z.string(),
  levelId: z.number().nullable(),
  levelName: z.string().nullable(),
  moodleCohortId: z.number().nullable(),
  idnumber: z.string(),
  name: z.string(),
  syncStatus: SyncStatusSchema,
  syncError: z.string().nullable(),
  lastSyncAt: z.string().nullable(),
  memberCount: z.number().nullish(),
})

export const PushCohortDtoSchema = z.object({
  programId: z.number().int().positive(),
  academicSessionId: z.number().int().positive(),
  levelId: z.number().int().positive().optional(),
})

export const SyncCohortMembersResultSchema = z.object({
  added: z.number(),
  removed: z.number(),
  unchanged: z.number(),
})
