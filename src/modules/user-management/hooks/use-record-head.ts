"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  courseStructureKeys,
  departmentsApi,
  facultiesApi,
} from "@/services/courseStructureApi"

export interface RecordHeadInput {
  userId: number
  /** Set for an HOD: the department they head. */
  departmentId?: number
  /** Set for a dean: the faculty they lead. */
  facultyId?: number
}

export interface RecordHeadResult {
  /** "Department of X" / "Faculty of Y" that now has this person as head. */
  unitName: string
  /** The head was already recorded (by the server, sandbox/automation §8). */
  alreadyRecorded: boolean
  /** Someone else was head before and has been replaced. */
  replacedPrevious: boolean
}

/**
 * Makes sure a new HOD or dean is recorded as head of the department or
 * faculty chosen when they were created. The server is proposed to do this
 * itself (sandbox/automation §8). Until it does, the portal sets
 * `hodUserId`/`deanUserId` with the normal department/faculty update; once
 * it does, this finds it already set and changes nothing.
 */
export function useRecordHead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      userId,
      departmentId,
      facultyId,
    }: RecordHeadInput): Promise<RecordHeadResult | null> => {
      if (departmentId) {
        const { data } = await departmentsApi.getById(departmentId)
        if (data.hodUserId === userId)
          return {
            unitName: data.name,
            alreadyRecorded: true,
            replacedPrevious: false,
          }
        await departmentsApi.update(departmentId, { hodUserId: userId })
        return {
          unitName: data.name,
          alreadyRecorded: false,
          replacedPrevious: data.hodUserId != null,
        }
      }
      if (facultyId) {
        const { data } = await facultiesApi.getById(facultyId)
        if (data.deanUserId === userId)
          return {
            unitName: data.name,
            alreadyRecorded: true,
            replacedPrevious: false,
          }
        await facultiesApi.update(facultyId, { deanUserId: userId })
        return {
          unitName: data.name,
          alreadyRecorded: false,
          replacedPrevious: data.deanUserId != null,
        }
      }
      return null
    },
    onSuccess: async (_, v) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: courseStructureKeys.departments.all }),
        qc.invalidateQueries({ queryKey: courseStructureKeys.faculties.all }),
      ])
      if (v.departmentId)
        await qc.invalidateQueries({
          queryKey: courseStructureKeys.departments.detail(v.departmentId),
        })
      if (v.facultyId)
        await qc.invalidateQueries({
          queryKey: courseStructureKeys.faculties.detail(v.facultyId),
        })
    },
  })
}
