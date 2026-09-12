"use client"

import { useQuery } from "@tanstack/react-query"
import { hostelService } from "../services/hostel.service"
import { hostelKeys } from "./query-keys"
import type { AllocationQueryFilters } from "../types"

export function useAllocations(filters?: AllocationQueryFilters) {
  return useQuery({
    queryKey: hostelKeys.allocations(filters),
    queryFn: () => hostelService.listAllocations(filters),
    staleTime: 30 * 1000,
  })
}

export function useStudentAllocations(studentId: number) {
  return useQuery({
    queryKey: hostelKeys.allocationsByStudent(studentId),
    queryFn: () => hostelService.getStudentAllocations(studentId),
    enabled: !!studentId,
  })
}
