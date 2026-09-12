// ──────────────────────────────────────────────
// Demographics Module — Country / State / Local Government Types
// Backend contract: sandbox/demographics/demographics_workflow.md (proposed,
// not built yet — see src/modules/demographics/services/demographics.service.ts).
// ──────────────────────────────────────────────

export interface Country {
  id: number
  name: string
  code: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface State {
  id: number
  countryId: number
  name: string
  code: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface LocalGovernment {
  id: number
  stateId: number
  name: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateCountryPayload {
  name: string
  code?: string
  isActive?: boolean
}

export type UpdateCountryPayload = Partial<CreateCountryPayload>

export interface CreateStatePayload {
  countryId: number
  name: string
  code?: string
  isActive?: boolean
}

export type UpdateStatePayload = Partial<Omit<CreateStatePayload, "countryId">>

export interface CreateLocalGovernmentPayload {
  stateId: number
  name: string
  isActive?: boolean
}

export type UpdateLocalGovernmentPayload = Partial<
  Omit<CreateLocalGovernmentPayload, "stateId">
>

export interface DemographicsListFilters {
  search?: string
  isActive?: boolean
}
