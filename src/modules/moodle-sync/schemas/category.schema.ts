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
  // Major-Program Scoping — sandbox/BACKEND_DEVIATIONS_2026-09-14.md A35.
  // Another "Frontend Contract Addition," same pattern as unitName/
  // unitTypeCode/parentId above: derived client-side (never sent by the
  // backend) by walking this node's AcademicUnit ancestor chain for the
  // nearest `linkedEntity.type === "major_program"` (A18 — resolved
  // 2026-09-16). Real per-node data, not a guess, since this deployment's
  // own Moodle category tree is already rooted one-major-program-per-branch
  // (e.g. "PART-TIME PROGRAMS"). `null` when no ancestor (including the
  // node itself) is linked to a MajorProgram yet.
  majorProgramId: z.number().nullable(),
})

// Resolving a flagged (needsMapping: true) row pulled from Moodle with no
// resolvable idnumber — either link it to an existing Faculty/Department/
// Program/Level/Semester entity, or fix its type/parent as a pure
// structural node. See api-v2.md §"POST /moodle-sync/categories/{id}/resolve".
export const ResolveCategoryMappingSchema = z.union([
  z.object({
    linkedEntity: z.object({
      // "major_program" — sandbox/major-program-scoping/: lets an admin
      // manually resolve a category to a MajorProgram root node the same
      // way as any other entity kind.
      type: z.enum([
        "faculty",
        "department",
        "program",
        "level",
        "semester",
        "major_program",
      ]),
      id: z.number().int().positive(),
    }),
  }),
  z.object({
    typeCode: z.string().min(1),
    parentId: z.number().int().positive().nullable(),
  }),
])
