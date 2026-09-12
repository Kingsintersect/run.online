"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { hostelService } from "../services/hostel.service"
import { hostelKeys } from "./query-keys"
import type {
  BulkCreateRoomsDto,
  CreateAllocationDto,
  CreateBlockDto,
  CreateHostelDto,
  CreateRoomDto,
  UpdateBlockDto,
  UpdateHostelDto,
  UpdateRoomDto,
} from "../types"

// ── Hostels ──────────────────────────────────────────────────────────────────

export function useCreateHostel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateHostelDto) => hostelService.createHostel(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: hostelKeys.hostels() }),
  })
}

export function useUpdateHostel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdateHostelDto }) =>
      hostelService.updateHostel(id, dto),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: hostelKeys.hostels() })
      qc.invalidateQueries({ queryKey: hostelKeys.hostel(variables.id) })
    },
  })
}

export function useDeactivateHostel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => hostelService.deactivateHostel(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: hostelKeys.hostels() }),
  })
}

// ── Blocks ───────────────────────────────────────────────────────────────────

export function useCreateBlock() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      hostelId,
      dto,
    }: {
      hostelId: number
      dto: CreateBlockDto
    }) => hostelService.createBlock(hostelId, dto),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: hostelKeys.blocks(variables.hostelId) })
      qc.invalidateQueries({ queryKey: hostelKeys.hostel(variables.hostelId) })
    },
  })
}

export function useUpdateBlock() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdateBlockDto }) =>
      hostelService.updateBlock(id, dto),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: hostelKeys.all })
      qc.invalidateQueries({ queryKey: hostelKeys.block(variables.id) })
    },
  })
}

export function useDeactivateBlock() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => hostelService.deactivateBlock(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: hostelKeys.all }),
  })
}

// ── Rooms ────────────────────────────────────────────────────────────────────

export function useCreateRoom() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ blockId, dto }: { blockId: number; dto: CreateRoomDto }) =>
      hostelService.createRoom(blockId, dto),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: hostelKeys.rooms(variables.blockId) })
      qc.invalidateQueries({ queryKey: hostelKeys.block(variables.blockId) })
    },
  })
}

export function useBulkCreateRooms() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      blockId,
      dto,
    }: {
      blockId: number
      dto: BulkCreateRoomsDto
    }) => hostelService.bulkCreateRooms(blockId, dto),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: hostelKeys.rooms(variables.blockId) })
      qc.invalidateQueries({ queryKey: hostelKeys.block(variables.blockId) })
    },
  })
}

export function useUpdateRoom() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdateRoomDto }) =>
      hostelService.updateRoom(id, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: hostelKeys.all }),
  })
}

// ── Allocations ──────────────────────────────────────────────────────────────

export function useCreateAllocation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateAllocationDto) =>
      hostelService.createAllocation(dto),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: hostelKeys.all })
      qc.invalidateQueries({
        queryKey: hostelKeys.allocationsByStudent(variables.studentId),
      })
    },
  })
}

export function useVacateAllocation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => hostelService.vacateAllocation(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: hostelKeys.all }),
  })
}
