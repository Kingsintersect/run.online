import { z } from "zod"
import { SyncStatusSchema, SyncDirectionSchema } from "./common.schema"

// `courseCode`/`courseTitle` are display-only convenience fields — see
// "Frontend Contract Additions" in moodle_sync_UI_README.md.
export const CourseSyncResponseSchema = z.object({
  id: z.number(),
  courseOfferingId: z.number(),
  courseCode: z.string(),
  courseTitle: z.string(),
  moodleCourseId: z.number().nullable(),
  moodleCategoryId: z.number().nullable(),
  moodleShortName: z.string().nullable(),
  moodleFullName: z.string().nullable(),
  syncStatus: SyncStatusSchema,
  syncDirection: SyncDirectionSchema,
  lastSyncAt: z.string().nullable(),
})
