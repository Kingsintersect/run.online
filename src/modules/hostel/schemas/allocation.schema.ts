import { z } from "zod"

export const AllocationStatusSchema = z.enum(["active", "vacated"])

export const CreateAllocationDtoSchema = z.object({
  studentId: z.number().int().positive(),
  roomId: z.number().int().positive(),
  sessionId: z.number().int().positive(),
})

export const AllocationQueryFiltersSchema = z.object({
  sessionId: z.number().optional(),
  hostelId: z.number().optional(),
  studentId: z.number().optional(),
  page: z.number().optional(),
  limit: z.number().optional(),
})

export const AllocationResponseSchema = z.object({
  id: z.number(),
  studentId: z.number(),
  roomId: z.number(),
  sessionId: z.number(),
  status: AllocationStatusSchema,
  allocatedAt: z.string(),
  vacatedAt: z.string().nullable().optional(),
  // Present on the Create response and (per the same shape) list/by-student.
  room: z
    .object({
      roomNumber: z.string(),
      block: z.object({
        name: z.string(),
        hostel: z.object({ name: z.string() }),
      }),
    })
    .optional(),
})

export const AllocationListMetaSchema = z.object({
  total: z.number(),
  page: z.number(),
  limit: z.number(),
})

export const AllocationListResponseSchema = z.object({
  data: z.array(AllocationResponseSchema),
  meta: AllocationListMetaSchema,
})

export const VacateAllocationResponseSchema = z.object({
  id: z.number(),
  status: z.literal("vacated"),
  vacatedAt: z.string(),
})
