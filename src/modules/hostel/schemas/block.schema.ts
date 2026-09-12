import { z } from "zod"

export const CreateBlockDtoSchema = z.object({
  name: z.string().min(1).max(50),
  floors: z.number().int().positive(),
})

export const UpdateBlockDtoSchema = CreateBlockDtoSchema.partial()

export const BlockResponseSchema = z.object({
  id: z.number(),
  hostelId: z.number(),
  name: z.string(),
  floors: z.number(),
  isActive: z.boolean(),
  // Present on GET /hostels/blocks/:id (includes rooms); absent elsewhere.
  rooms: z.array(z.lazy(() => RoomSummarySchema)).optional(),
})

// Minimal room shape nested inside a block's detail response — the full
// RoomResponseSchema (with its own optional `occupants`) lives in room.schema.ts.
export const RoomSummarySchema = z.object({
  id: z.number(),
  roomNumber: z.string(),
  floor: z.number(),
  capacity: z.number(),
  roomType: z.string(),
  isAvailable: z.boolean(),
})
