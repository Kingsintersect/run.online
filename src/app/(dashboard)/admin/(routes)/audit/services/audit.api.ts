import apiClient, { RequestOptions } from "@/lib/clients/apiClient"
import type {
  AuditQueryParams,
  AuditLogsResponse,
  AuditEntityLog,
  AuditLogDetail,
  AuditStats,
  AuditEntityType,
  AuditEntityLogsResponse,
} from "../types/audit.types"

/**
 * Audit API Client
 *
 * Uses the shared ApiClient for consistent request handling,
 * token management, error handling, and logging.
 *
 * Usage in hooks:
 *   import { auditApi } from "@/lib/api/audit.api";
 */

export const auditApi = {
  /**
   * GET /audit/logs
   * Fetches audit logs with pagination and filters
   */
  getLogs: async (
    params: AuditQueryParams,
    options?: RequestOptions
  ): Promise<AuditLogsResponse> => {
    const queryParams: Record<string, unknown> = {}

    // Build query params object for ApiClient
    if (params.page) queryParams.page = String(params.page)
    if (params.limit) queryParams.limit = String(params.limit)
    if (params.search) queryParams.search = params.search
    if (params.action) queryParams.action = params.action
    if (params.entityType) queryParams.entityType = params.entityType
    if (params.userId) queryParams.userId = String(params.userId)
    if (params.startDate) queryParams.startDate = params.startDate
    if (params.endDate) queryParams.endDate = params.endDate
    if (params.academicYear) queryParams.academicYear = params.academicYear
    if (params.semester) queryParams.semester = params.semester
    if (params.program) queryParams.program = params.program

    return apiClient.get<AuditLogsResponse>("/audit/logs", {
      params: queryParams,
      access_token: true,
      ...options,
    })
  },

  /**
   * GET /audit/logs/:id
   * Fetches a single audit log entry with oldValues/newValues JSON-decoded
   * (the list endpoint may leave them as raw JSON text). Bruno:
   * audit/Logs - Get By ID.bru. Response shape is undocumented in the
   * README, so accept both a bare object and a `{ data }` envelope.
   */
  getLogById: async (
    id: number,
    options?: RequestOptions
  ): Promise<AuditLogDetail> => {
    const body = await apiClient.get<AuditLogDetail | { data: AuditLogDetail }>(
      `/audit/logs/${id}`,
      {
        access_token: true,
        ...options,
      }
    )
    return "data" in body ? body.data : body
  },

  /**
   * GET /audit/logs/user/:userId
   * Fetches logs for a specific user
   */
  getUserLogs: async (
    userId: number,
    params: AuditQueryParams,
    options?: RequestOptions
  ): Promise<AuditLogsResponse> => {
    const queryParams: Record<string, unknown> = {}

    if (params.page) queryParams.page = String(params.page)
    if (params.limit) queryParams.limit = String(params.limit)
    if (params.search) queryParams.search = params.search
    if (params.action) queryParams.action = params.action
    if (params.startDate) queryParams.startDate = params.startDate
    if (params.endDate) queryParams.endDate = params.endDate

    return apiClient.get<AuditLogsResponse>(`/audit/logs/user/${userId}`, {
      params: queryParams,
      access_token: true,
      ...options,
    })
  },

  /**
   * GET /audit/logs/entity/:type/:id
   * Fetches logs for a specific entity
   */
  getEntityLogs: async (
    entityType: AuditEntityType | string,
    entityId: number,
    options?: RequestOptions
  ): Promise<AuditEntityLogsResponse> => {
    return apiClient.get<AuditEntityLogsResponse>(
      `/audit/logs/entity/${entityType}/${entityId}`,
      {
        access_token: true,
        ...options,
      }
    )
  },

  /**
   * GET /audit/stats
   * Fetches audit statistics
   */
  getStats: async (options?: RequestOptions): Promise<AuditStats> => {
    return apiClient.get<AuditStats>("/audit/stats", {
      access_token: true,
      ...options,
    })
  },

  // Note: `GET /audit/export` and `POST /audit/log` are NOT real endpoints
  // (verified 404, 2026-09-10). Audit rows are written by the backend itself,
  // never via REST, and the export menu (`useAuditExport` → `exportAuditLogs`)
  // builds the file client-side from the already-loaded rows — so no
  // server-side export call is needed.
}

// Export types for convenience
export type {
  AuditQueryParams,
  AuditLogsResponse,
  AuditEntityLog,
  AuditStats,
  AuditEntityType,
  AuditEntityLogsResponse,
}
