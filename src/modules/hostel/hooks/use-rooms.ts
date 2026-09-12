"use client"

import { useQuery } from "@tanstack/react-query"
import { hostelService } from "../services/hostel.service"
import { hostelKeys } from "./query-keys"
import type { AvailableRoomsQuery } from "../types"

export function useRooms(blockId: number) {
  return useQuery({
    queryKey: hostelKeys.rooms(blockId),
    queryFn: () => hostelService.listRooms(blockId),
    enabled: !!blockId,
    staleTime: 60 * 1000,
  })
}

export function useRoom(id: number) {
  return useQuery({
    queryKey: hostelKeys.room(id),
    queryFn: () => hostelService.getRoom(id),
    enabled: !!id,
  })
}

export function useAvailableRooms(filters: AvailableRoomsQuery | null) {
  return useQuery({
    queryKey: hostelKeys.availableRooms(filters ?? { sessionId: 0 }),
    queryFn: () => hostelService.listAvailableRooms(filters!),
    enabled: !!filters?.sessionId,
  })
}
