import { z } from "zod"

// Free-form on the backend (max 20 chars) — hostel_README.md gives these as
// examples. Offered as quick-pick options; any string up to 20 chars works.
export const COMMON_ROOM_TYPES = ["single", "double", "shared"] as const

export const CreateRoomDtoSchema = z.object({
  roomNumber: z.string().min(1).max(10),
  floor: z.number().int().nonnegative(),
  capacity: z.number().int().positive(),
  roomType: z.string().min(1).max(20),
})

export const UpdateRoomDtoSchema = z.object({
  roomNumber: z.string().min(1).max(10).optional(),
  floor: z.number().int().nonnegative().optional(),
  capacity: z.number().int().positive().optional(),
  roomType: z.string().min(1).max(20).optional(),
  isAvailable: z.boolean().optional(),
})

export const BulkCreateRoomsDtoSchema = z.object({
  rooms: z.array(CreateRoomDtoSchema).min(1),
})

export const BulkCreateRoomsResponseSchema = z.object({
  created: z.number(),
  errors: z.array(z.object({ roomNumber: z.string(), message: z.string() })),
})

const RoomOccupantSchema = z.object({
  studentId: z.number(),
  matricNumber: z.string(),
  name: z.string(),
  sessionId: z.number(),
})

export const RoomResponseSchema = z.object({
  id: z.number(),
  blockId: z.number(),
  roomNumber: z.string(),
  floor: z.number(),
  capacity: z.number(),
  roomType: z.string(),
  isAvailable: z.boolean(),
  // Present on GET /hostels/rooms/:id — current active occupants.
  occupants: z.array(RoomOccupantSchema).optional(),
})

export const AvailableRoomsQuerySchema = z.object({
  sessionId: z.number(),
  hostelId: z.number().optional(),
  hostelType: z.enum(["male", "female"]).optional(),
  roomType: z.string().optional(),
})

export const AvailableRoomResponseSchema = z.object({
  id: z.number(),
  roomNumber: z.string(),
  floor: z.number(),
  capacity: z.number(),
  roomType: z.string(),
  currentOccupancy: z.number(),
  vacancies: z.number(),
  block: z.object({
    name: z.string(),
    hostel: z.object({ name: z.string(), hostelType: z.string() }),
  }),
})
