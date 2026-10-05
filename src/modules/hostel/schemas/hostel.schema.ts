import { z } from "zod"

export const HostelTypeSchema = z.enum(["male", "female"])

export const CreateHostelDtoSchema = z.object({
  name: z.string().min(1).max(100),
  hostelType: HostelTypeSchema,
  address: z.string().optional(),
})

export const UpdateHostelDtoSchema = CreateHostelDtoSchema.partial()

export const HostelResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
  hostelType: HostelTypeSchema,
  address: z.string().nullable().optional(),
  isActive: z.boolean(),
  // Present on GET /hostels/:id (includes blocks); `null` on the list
  // (live QHUB 2026-10-05) and absent on mutation responses.
  blocks: z
    .array(z.lazy(() => BlockSummarySchema))
    .nullable()
    .optional(),
})

// Minimal block shape nested inside a hostel's detail response — the full
// BlockResponseSchema (with its own optional `rooms`) lives in block.schema.ts.
export const BlockSummarySchema = z.object({
  id: z.number(),
  name: z.string(),
  floors: z.number(),
  isActive: z.boolean(),
})
