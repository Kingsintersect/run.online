import type { AllocationQueryFilters, AvailableRoomsQuery } from "../types"

export const hostelKeys = {
  all: ["hostels"] as const,

  hostels: () => [...hostelKeys.all, "list"] as const,
  hostel: (id: number) => [...hostelKeys.all, "detail", id] as const,

  blocks: (hostelId: number) =>
    [...hostelKeys.all, "blocks", hostelId] as const,
  block: (id: number) => [...hostelKeys.all, "block", id] as const,

  rooms: (blockId: number) => [...hostelKeys.all, "rooms", blockId] as const,
  room: (id: number) => [...hostelKeys.all, "room", id] as const,
  availableRooms: (filters: AvailableRoomsQuery) =>
    [...hostelKeys.all, "rooms", "available", filters] as const,

  allocations: (filters?: AllocationQueryFilters) =>
    [...hostelKeys.all, "allocations", filters] as const,
  allocationsByStudent: (studentId: number) =>
    [...hostelKeys.all, "allocations", "student", studentId] as const,
} as const
