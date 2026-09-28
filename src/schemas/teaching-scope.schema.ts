import { z } from "zod"

// GET /me/teaching-scope (sandbox/cross-program-teaching/API_CONTRACTS.md §9):
// the major programs and programs the caller teaches in or heads. The field
// names follow the proposal; snake_case twins are accepted too.
const ReasonSchema = z.enum(["teaches", "heads"])

const ScopeProgramSchema = z
  .object({
    id: z.number(),
    name: z.string(),
    reasons: z.array(ReasonSchema).optional().default([]),
  })
  .loose()

export const TeachingScopeEntrySchema = z
  .object({
    majorProgramId: z.number().optional(),
    major_program_id: z.number().optional(),
    majorProgramName: z.string().optional(),
    major_program_name: z.string().optional(),
    reasons: z.array(ReasonSchema).optional().default([]),
    programs: z.array(ScopeProgramSchema).optional().default([]),
  })
  .loose()
  .transform((e) => ({
    majorProgramId: e.majorProgramId ?? e.major_program_id ?? 0,
    majorProgramName: e.majorProgramName ?? e.major_program_name ?? null,
    reasons: e.reasons,
    programs: e.programs.map((p) => ({
      id: p.id,
      name: p.name,
      reasons: p.reasons,
    })),
  }))
  .refine((e) => e.majorProgramId > 0, "majorProgramId is required")

export const TeachingScopeResponseSchema = z.object({
  data: z.array(TeachingScopeEntrySchema),
})

export type TeachingScopeEntry = z.output<typeof TeachingScopeEntrySchema>
