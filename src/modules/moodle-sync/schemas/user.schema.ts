import { z } from "zod"
import { SyncStatusSchema, SyncDirectionSchema } from "./common.schema"

export const MoodleRoleSchema = z.enum([
  "student",
  "editingteacher",
  "teacher",
  "manager",
])
export const PortalRoleSchema = z.enum(["STUDENT", "TUTOR", "STAFF", "ADMIN"])

// `portalRole`/`name`/`email` are display-only convenience fields — see
// "Frontend Contract Additions" in moodle_sync_UI_README.md.
export const UserSyncResponseSchema = z.object({
  id: z.number(),
  userId: z.number(),
  name: z.string(),
  email: z.string(),
  portalRole: PortalRoleSchema,
  moodleUserId: z.number().nullable(),
  moodleUsername: z.string().nullable(),
  moodleRole: MoodleRoleSchema,
  syncStatus: SyncStatusSchema,
  syncDirection: SyncDirectionSchema,
  lastSyncAt: z.string().nullable(),
})

export const UserSyncQueryFiltersSchema = z.object({
  role: MoodleRoleSchema.optional(),
  status: SyncStatusSchema.optional(),
})

// A Moodle user found on `POST /users/pull` with no matching portal account
// (matched by email) — exists on the LMS but not on the portal yet.
// `firstName`/`lastName` are requested-but-not-yet-shipped (see
// moodle_sync_BACKEND_GAPS.md §5) — optional so today's response (which omits
// them) still parses; the display name in `unmatched-users-modal.tsx` already
// prefers them over `username` the moment the backend starts sending them,
// with no frontend change required.
export const UnmatchedMoodleUserSchema = z.object({
  moodleUserId: z.number(),
  username: z.string(),
  email: z.string(),
  moodleRole: MoodleRoleSchema,
  firstName: z.string().nullish(),
  lastName: z.string().nullish(),
})

// A Moodle user found during `POST /users/pull` that was intentionally not
// synced (e.g. already matched, disallowed role, duplicate email). Requested
// but not yet shipped — see moodle_sync_BACKEND_GAPS.md §5.
export const SkippedMoodleUserSchema = z.object({
  moodleUserId: z.number(),
  username: z.string(),
  email: z.string(),
  moodleRole: MoodleRoleSchema,
  reason: z.string(),
})

export const PullUsersResultSchema = z.object({
  matched: z.number(),
  skipped: z.number(),
  // Optional: today's backend only sends the `skipped` count. Once
  // `skippedUsers` ships, `skipped-users-modal.tsx` picks it up automatically
  // — see moodle_sync_BACKEND_GAPS.md §5.
  skippedUsers: z.array(SkippedMoodleUserSchema).nullish(),
  unmatched: z.array(UnmatchedMoodleUserSchema),
})
