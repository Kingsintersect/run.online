import apiClient from "@/lib/clients/apiClient"
import type {
  AllocationListResponse,
  AllocationQueryFilters,
  AllocationResponse,
  AvailableRoomResponse,
  AvailableRoomsQuery,
  BlockResponse,
  BulkCreateRoomsDto,
  BulkCreateRoomsResponse,
  CreateAllocationDto,
  CreateBlockDto,
  CreateHostelDto,
  CreateRoomDto,
  HostelResponse,
  RoomResponse,
  UpdateBlockDto,
  UpdateHostelDto,
  UpdateRoomDto,
  VacateAllocationResponse,
} from "../types"

// Real backend contract per bruno/hostel/*.bru (the sole source of truth for
// this module — see CLAUDE.md §13). GET endpoints are wrapped in a
// `{ data: ... }` envelope (Allocations - List additionally carries `meta`)
// — confirmed by every GET .bru file's docs block. Mutation endpoints
// (POST/PATCH/DELETE) return the flat resource — confirmed explicitly by
// every mutation .bru file's "not wrapped in data" / "response is flat" note.
const BASE = "/hostels"
const AUTH = { access_token: true } as const

export const hostelService = {
  // ── Hostels ──────────────────────────────────────────────────────────────

  async listHostels(): Promise<HostelResponse[]> {
    const res = await apiClient.get<{ data: HostelResponse[] }>(BASE, AUTH)
    return res.data
  },

  async getHostel(id: number): Promise<HostelResponse> {
    const res = await apiClient.get<{ data: HostelResponse }>(
      `${BASE}/${id}`,
      AUTH
    )
    return res.data
  },

  createHostel: (dto: CreateHostelDto) =>
    apiClient.post<HostelResponse>(BASE, dto, AUTH),

  updateHostel: (id: number, dto: UpdateHostelDto) =>
    apiClient.patch<HostelResponse>(`${BASE}/${id}`, dto, AUTH),

  deactivateHostel: (id: number) =>
    apiClient.delete<HostelResponse>(`${BASE}/${id}`, AUTH),

  // ── Blocks ───────────────────────────────────────────────────────────────

  async listBlocks(hostelId: number): Promise<BlockResponse[]> {
    const res = await apiClient.get<{ data: BlockResponse[] }>(
      `${BASE}/${hostelId}/blocks`,
      AUTH
    )
    return res.data
  },

  async getBlock(id: number): Promise<BlockResponse> {
    const res = await apiClient.get<{ data: BlockResponse }>(
      `${BASE}/blocks/${id}`,
      AUTH
    )
    return res.data
  },

  createBlock: (hostelId: number, dto: CreateBlockDto) =>
    apiClient.post<BlockResponse>(`${BASE}/${hostelId}/blocks`, dto, AUTH),

  updateBlock: (id: number, dto: UpdateBlockDto) =>
    apiClient.patch<BlockResponse>(`${BASE}/blocks/${id}`, dto, AUTH),

  deactivateBlock: (id: number) =>
    apiClient.delete<BlockResponse>(`${BASE}/blocks/${id}`, AUTH),

  // ── Rooms ────────────────────────────────────────────────────────────────

  async listRooms(blockId: number): Promise<RoomResponse[]> {
    const res = await apiClient.get<{ data: RoomResponse[] }>(
      `${BASE}/blocks/${blockId}/rooms`,
      AUTH
    )
    return res.data
  },

  async getRoom(id: number): Promise<RoomResponse> {
    const res = await apiClient.get<{ data: RoomResponse }>(
      `${BASE}/rooms/${id}`,
      AUTH
    )
    return res.data
  },

  createRoom: (blockId: number, dto: CreateRoomDto) =>
    apiClient.post<RoomResponse>(`${BASE}/blocks/${blockId}/rooms`, dto, AUTH),

  bulkCreateRooms: (blockId: number, dto: BulkCreateRoomsDto) =>
    apiClient.post<BulkCreateRoomsResponse>(
      `${BASE}/blocks/${blockId}/rooms/bulk`,
      dto,
      AUTH
    ),

  updateRoom: (id: number, dto: UpdateRoomDto) =>
    apiClient.patch<RoomResponse>(`${BASE}/rooms/${id}`, dto, AUTH),

  async listAvailableRooms(
    filters: AvailableRoomsQuery
  ): Promise<AvailableRoomResponse[]> {
    const res = await apiClient.get<{ data: AvailableRoomResponse[] }>(
      `${BASE}/rooms/available`,
      { ...AUTH, params: filters as Record<string, unknown> }
    )
    return res.data
  },

  // ── Allocations ──────────────────────────────────────────────────────────

  async listAllocations(
    filters: AllocationQueryFilters = {}
  ): Promise<AllocationListResponse> {
    return apiClient.get<AllocationListResponse>(`${BASE}/allocations`, {
      ...AUTH,
      params: filters as Record<string, unknown>,
    })
  },

  async getStudentAllocations(
    studentId: number
  ): Promise<AllocationResponse[]> {
    const res = await apiClient.get<{ data: AllocationResponse[] }>(
      `${BASE}/allocations/student/${studentId}`,
      AUTH
    )
    return res.data
  },

  createAllocation: (dto: CreateAllocationDto) =>
    apiClient.post<AllocationResponse>(`${BASE}/allocations`, dto, AUTH),

  vacateAllocation: (id: number) =>
    apiClient.patch<VacateAllocationResponse>(
      `${BASE}/allocations/${id}/vacate`,
      undefined,
      AUTH
    ),
}
