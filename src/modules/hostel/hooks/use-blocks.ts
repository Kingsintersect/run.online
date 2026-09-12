"use client"

import { useQuery } from "@tanstack/react-query"
import { hostelService } from "../services/hostel.service"
import { hostelKeys } from "./query-keys"

export function useBlocks(hostelId: number) {
  return useQuery({
    queryKey: hostelKeys.blocks(hostelId),
    queryFn: () => hostelService.listBlocks(hostelId),
    enabled: !!hostelId,
    staleTime: 60 * 1000,
  })
}

export function useBlock(id: number) {
  return useQuery({
    queryKey: hostelKeys.block(id),
    queryFn: () => hostelService.getBlock(id),
    enabled: !!id,
  })
}
