import { z } from "zod"
import { SyncStatusSchema, SyncDirectionSchema } from "./common.schema"

// Multi-structure refactor — see sandbox/schema-moodel-sync-refactor/
// {README,api-v2}.md §"Moodle Category Sync". Replaces the old fixed
// 5-entity-type scheme (`entityType`/`entityId`) with a single
// `academicUnitId` FK into the generic AcademicUnit tree — one node type
// instead of five, any depth, any structure. See MISSING_BACKEND_APIS.md
// §2.16.

export const PushCategoryDtoSchema = z.object({
  academicUnitId: z.number().int().positive(),
  parentMoodleCategoryId: z.number().int().positive().optional(),
})

// `unitName`/`unitTypeCode`/`parentId` are display-only convenience fields
// this frontend enriches client-side (joined against the AcademicUnit tree
// — see moodle-sync.service.ts's listCategories), matching the same
// "Frontend Contract Additions" pattern the old entityType/entityId schema
// used for `entityName`/`parentId`. `moodleCategoryId`/`moodleCategoryName`
// stay nullable so the tree can represent units that exist but have never
// been pushed (syncStatus: "PENDING").
export const CategorySyncResponseSchema = z.object({
  id: z.number(),
  academicUnitId: z.number(),
  unitName: z.string(),
  unitTypeCode: z.string(),
  parentId: z.number().nullable(),
  moodleCategoryId: z.number().nullable(),
  moodleCategoryName: z.string().nullable(),
  parentMoodleCategoryId: z.number().nullable(),
  syncStatus: SyncStatusSchema,
  syncDirection: SyncDirectionSchema,
  needsMapping: z.boolean(),
  syncError: z.string().nullable(),
  lastSyncAt: z.string().nullable(),
})

// Resolving a flagged (needsMapping: true) row pulled from Moodle with no
// resolvable idnumber — either link it to an existing Faculty/Department/
// Program/Level/Semester entity, or fix its type/parent as a pure
// structural node. See api-v2.md §"POST /moodle-sync/categories/{id}/resolve".
export const ResolveCategoryMappingSchema = z.union([
  z.object({
    linkedEntity: z.object({
      type: z.enum(["faculty", "department", "program", "level", "semester"]),
      id: z.number().int().positive(),
    }),
  }),
  z.object({
    typeCode: z.string().min(1),
    parentId: z.number().int().positive().nullable(),
  }),
])
