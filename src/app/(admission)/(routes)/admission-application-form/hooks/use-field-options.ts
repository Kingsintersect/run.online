"use client"

import { useAcademicSessions } from "@/hooks/useAcademicSessions"
import { useAllPrograms } from "@/hooks/useCourseStructure"
import {
  useCountries,
  useLocalGovernments,
  useStates,
} from "@/modules/demographics/hooks/use-demographics"
import type {
  AdmissionFormField,
  FormFieldOption,
} from "@/types/admissionConfig"
import { ENTRY_MODES, EXAM_TYPES } from "../schema/admission-schema"

const ENTRY_MODE_LABELS: Record<(typeof ENTRY_MODES)[number], string> = {
  UTME: "UTME",
  DIRECT_ENTRY: "Direct Entry",
  TRANSFER: "Transfer",
}

interface FieldOptions {
  options: FormFieldOption[]
  isLoading: boolean
  /** Why no options can be shown yet, e.g. the country isn't chosen. */
  waitingFor?: string
}

/**
 * Answer choices for a dropdown/choice question — its static `options`, or
 * data from `optionsSource` (sandbox/dynamic-admission/SCHEMA_CHANGES.md §1).
 *
 * `dependsOnValue` is the answer to the field's `dependsOn` question (e.g. the
 * country for STATES); `parentDependsOnValue` is one level further up (the
 * country, for an LGAS field that depends on a state). Countries, states and
 * LGAs are stored by name, programs and sessions by id/name as today.
 */
export function useFieldOptions(
  field: AdmissionFormField,
  dependsOnValue?: string,
  parentDependsOnValue?: string
): FieldOptions {
  const source = field.optionsSource ?? null
  const needsCountries =
    source === "COUNTRIES" || source === "STATES" || source === "LGAS"

  const countries = useCountries()
  const countryName =
    source === "STATES"
      ? dependsOnValue
      : source === "LGAS"
        ? parentDependsOnValue
        : undefined
  const countryId =
    needsCountries && countryName
      ? ((countries.data ?? []).find((c) => c.name === countryName)?.id ?? null)
      : null
  const states = useStates(countryId)
  const stateId =
    source === "LGAS" && dependsOnValue
      ? ((states.data ?? []).find((s) => s.name === dependsOnValue)?.id ?? null)
      : null
  const lgas = useLocalGovernments(stateId)
  const programs = useAllPrograms()
  const sessions = useAcademicSessions()

  switch (source) {
    case null:
      return { options: field.options ?? [], isLoading: false }
    case "COUNTRIES":
      return {
        options: (countries.data ?? []).map((c) => ({
          value: c.name,
          label: c.name,
        })),
        isLoading: countries.isLoading,
      }
    case "STATES":
      if (!dependsOnValue)
        return { options: [], isLoading: false, waitingFor: "the country" }
      return {
        options: (states.data ?? []).map((s) => ({
          value: s.name,
          label: s.name,
        })),
        isLoading: countries.isLoading || states.isLoading,
      }
    case "LGAS":
      if (!dependsOnValue)
        return { options: [], isLoading: false, waitingFor: "the state" }
      return {
        options: (lgas.data ?? []).map((l) => ({
          value: l.name,
          label: l.name,
        })),
        isLoading: states.isLoading || lgas.isLoading,
      }
    case "PROGRAMS":
      return {
        options: (programs.data?.data ?? [])
          .filter((p) => p.isActive)
          .map((p) => ({ value: String(p.id), label: p.name })),
        isLoading: programs.isLoading,
      }
    case "SESSIONS":
      return {
        options: (sessions.data ?? []).map((s) => ({
          value: s.name,
          label: s.name,
        })),
        isLoading: sessions.isLoading,
      }
    case "ENTRY_MODES":
      return {
        options: ENTRY_MODES.map((mode) => ({
          value: mode,
          label: ENTRY_MODE_LABELS[mode],
        })),
        isLoading: false,
      }
    case "EXAM_TYPES":
      return {
        options: EXAM_TYPES.map((type) => ({ value: type, label: type })),
        isLoading: false,
      }
  }
}
