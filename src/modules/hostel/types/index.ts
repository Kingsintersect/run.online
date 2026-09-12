import type { z } from "zod"
import * as HostelSchemas from "../schemas/hostel.schema"
import * as BlockSchemas from "../schemas/block.schema"
import * as RoomSchemas from "../schemas/room.schema"
import * as AllocationSchemas from "../schemas/allocation.schema"

export type HostelType = z.infer<typeof HostelSchemas.HostelTypeSchema>
export type CreateHostelDto = z.infer<
  typeof HostelSchemas.CreateHostelDtoSchema
>
export type UpdateHostelDto = z.infer<
  typeof HostelSchemas.UpdateHostelDtoSchema
>
export type HostelResponse = z.infer<typeof HostelSchemas.HostelResponseSchema>

export type CreateBlockDto = z.infer<typeof BlockSchemas.CreateBlockDtoSchema>
export type UpdateBlockDto = z.infer<typeof BlockSchemas.UpdateBlockDtoSchema>
export type BlockResponse = z.infer<typeof BlockSchemas.BlockResponseSchema>

export type CreateRoomDto = z.infer<typeof RoomSchemas.CreateRoomDtoSchema>
export type UpdateRoomDto = z.infer<typeof RoomSchemas.UpdateRoomDtoSchema>
export type BulkCreateRoomsDto = z.infer<
  typeof RoomSchemas.BulkCreateRoomsDtoSchema
>
export type BulkCreateRoomsResponse = z.infer<
  typeof RoomSchemas.BulkCreateRoomsResponseSchema
>
export type RoomResponse = z.infer<typeof RoomSchemas.RoomResponseSchema>
export type AvailableRoomsQuery = z.infer<
  typeof RoomSchemas.AvailableRoomsQuerySchema
>
export type AvailableRoomResponse = z.infer<
  typeof RoomSchemas.AvailableRoomResponseSchema
>

export type AllocationStatus = z.infer<
  typeof AllocationSchemas.AllocationStatusSchema
>
export type CreateAllocationDto = z.infer<
  typeof AllocationSchemas.CreateAllocationDtoSchema
>
export type AllocationQueryFilters = z.infer<
  typeof AllocationSchemas.AllocationQueryFiltersSchema
>
export type AllocationResponse = z.infer<
  typeof AllocationSchemas.AllocationResponseSchema
>
export type AllocationListResponse = z.infer<
  typeof AllocationSchemas.AllocationListResponseSchema
>
export type VacateAllocationResponse = z.infer<
  typeof AllocationSchemas.VacateAllocationResponseSchema
>
