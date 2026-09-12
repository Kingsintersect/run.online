"use client"

import { useQuery } from "@tanstack/react-query"
import { hostelService } from "../services/hostel.service"
import { hostelKeys } from "./query-keys"

export function useHostels() {
  return useQuery({
    queryKey: hostelKeys.hostels(),
    queryFn: hostelService.listHostels,
    staleTime: 60 * 1000,
  })
}

export function useHostel(id: number) {
  return useQuery({
    queryKey: hostelKeys.hostel(id),
    queryFn: () => hostelService.getHostel(id),
    enabled: !!id,
  })
}
