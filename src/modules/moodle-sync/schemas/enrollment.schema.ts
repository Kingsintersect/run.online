import { z } from "zod"
import { SyncStatusSchema, SyncDirectionSchema } from "./common.schema"

// `studentName`/`courseCode` are display-only convenience fields — see
// "Frontend Contract Additions" in moodle_sync_UI_README.md.
export const EnrollmentSyncResponseSchema = z.object({
  id: z.number(),
  studentEnrollmentId: z.number(),
  studentName: z.string(),
  courseCode: z.string(),
  moodleCourseId: z.number().nullable(),
  moodleUserId: z.number().nullable(),
  syncStatus: SyncStatusSchema,
  syncDirection: SyncDirectionSchema,
  syncError: z.string().nullable(),
  lastSyncAt: z.string().nullable(),
})
