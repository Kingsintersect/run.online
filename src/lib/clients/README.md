# API Client

This folder contains the shared HTTP client used across the app.

The client is built on top of Axios and adds:

- typed request and response helpers
- token storage and automatic auth header injection
- request and response interceptors
- optional token refresh flow
- optional structured logging
- global lifecycle hooks for request and error handling
- React Query option builders for a consistent data access pattern

The implementation lives in `apiClient.ts`.

## What It Solves

Instead of each feature module doing its own Axios setup, auth handling, error normalization, and React Query wiring, the app can use one controlled client with one behavior model.

This gives you:

- one place to configure API base URL and timeout
- one place to handle auth tokens
- one place to respond to `401` and `403`
- one place to add logging and diagnostics
- one place to define query and mutation patterns

## Main Exports

### Default Client

```ts
import apiClient from "@/lib/clients/apiClient"
```

This is the shared singleton instance configured with:

- `baseURL: API_BASE_URL`
- `timeout: 10000`

### Client Class

```ts
import { ApiClient } from "@/lib/clients/apiClient"
```

Use this when you need a separate isolated client instance.

### Error Class

```ts
import { ApiClientError } from "@/lib/clients/apiClient"
```

All normalized request failures are thrown as `ApiClientError`.

### React Query Builders

```ts
import {
  createApiQueryOptions,
  createApiMutationOptions,
} from "@/lib/clients/apiClient"
```

The client instance also exposes:

- `buildQueryOptions(...)`
- `buildMutationOptions(...)`

## Core Types

### `RequestOptions`

```ts
type RequestOptions = {
  access_token?: boolean
  headers?: Record<string, string>
  params?: Record<string, unknown>
  timeout?: number
  skipAuthRefresh?: boolean
  meta?: Record<string, unknown>
}
```

Meaning:

- `access_token`: attach `Authorization: Bearer <token>` automatically
- `headers`: request-specific headers
- `params`: query string params
- `timeout`: request-level timeout override
- `skipAuthRefresh`: disable retry-through-refresh for that request
- `meta`: arbitrary diagnostic metadata passed through logging

### `TokenPersistence`

```ts
type TokenPersistence = "memory" | "local" | "session"
```

Use this when storing access tokens.

### `ApiClientConfig`

```ts
type ApiClientConfig = {
  baseURL?: string
  timeout?: number
  defaultHeaders?: Record<string, string>
  enableLogging?: boolean
  logger?: ApiLogger
  hooks?: ApiClientHooks
  refreshAccessToken?: ApiRefreshHandler
}
```

This controls the behavior of a client instance.

## Basic Usage

### GET

```ts
const users = await apiClient.get<UserListResponse>("/api/v1/users", {
  access_token: true,
})
```

### POST With Typed Body

```ts
type CreateRoleBody = {
  name: string
  slug: string
}

type CreateRoleResponse = {
  data: {
    id: number
    name: string
    slug: string
  }
}

const result = await apiClient.post<CreateRoleResponse, CreateRoleBody>(
  "/api/v1/roles",
  {
    name: "Dean",
    slug: "dean",
  },
  { access_token: true }
)
```

### PUT

```ts
await apiClient.put<RoleResponse, UpdateRoleBody>(
  "/api/v1/roles/4",
  { name: "Updated Dean" },
  { access_token: true }
)
```

### PATCH

```ts
await apiClient.patch<RoleResponse, Partial<UpdateRoleBody>>(
  "/api/v1/roles/4",
  { name: "Acting Dean" },
  { access_token: true }
)
```

### DELETE

```ts
await apiClient.delete<{ message: string }>("/api/v1/roles/4", {
  access_token: true,
})
```

## Request Controls

### Query Params

```ts
await apiClient.get<AuditLogResponse>("/api/v1/audit-logs", {
  access_token: true,
  params: {
    page: 1,
    per_page: 20,
    module: "admin",
  },
})
```

### Per-request Timeout

```ts
await apiClient.get<LargeExportResponse>("/api/v1/reports/export", {
  access_token: true,
  timeout: 30000,
})
```

### Custom Headers

```ts
await apiClient.get<ProfileResponse>("/api/v1/profile", {
  access_token: true,
  headers: {
    "X-Tenant-ID": "qhub-main",
  },
})
```

### Meta For Diagnostics

```ts
await apiClient.get<DashboardStatsResponse>("/api/v1/dashboard/stats", {
  access_token: true,
  meta: {
    feature: "super-admin-dashboard",
    source: "overview-card",
  },
})
```

If logging is enabled, `meta` is available inside the logger event payload.

## Token Management

### Store Access Token

```ts
apiClient.setAccessToken(token, "local")
```

Storage modes:

- `'memory'`: only in memory for the current runtime
- `'local'`: persisted in `localStorage`
- `'session'`: persisted in `sessionStorage`

### Clear Access Token

```ts
apiClient.clearAccessToken()
```

### How Auth Header Injection Works

If a request passes `access_token: true`, the client will:

1. look for the token in memory first
2. if not found, look in `localStorage`
3. if not found, look in `sessionStorage`
4. attach `Authorization: Bearer <token>` if a token exists

## Runtime Reconfiguration

### Change Base URL

```ts
apiClient.setBaseURL("https://api.example.com")
```

### Set Default Header

```ts
apiClient.setDefaultHeader("X-Tenant-ID", "qhub-main")
apiClient.setDefaultHeader("X-Tenant-ID", null)
```

### Replace Config At Runtime

```ts
apiClient.setConfig({
  timeout: 15000,
  enableLogging: true,
  defaultHeaders: {
    "X-App-Version": "1.0.0",
  },
})
```

### Access Raw Axios Instance

```ts
const axiosInstance = apiClient.getAxiosInstance()
```

Use this only when you truly need low-level Axios access.

## Interceptors And Global Hooks

The client already registers internal Axios interceptors.

You control behavior through hooks rather than manually re-registering feature interceptors all over the app.

### Available Hooks

```ts
type ApiClientHooks = {
  onRequest?: (config) => void | Promise<void>
  onResponse?: (response) => void | Promise<void>
  onResponseError?: (error) => void | Promise<void>
  onUnauthorized?: (error) => void | Promise<void>
  onForbidden?: (error) => void | Promise<void>
  onTokenRefreshed?: (token) => void | Promise<void>
}
```

### Example: Global Auth/Error Hooks

```ts
apiClient.setHooks({
  onUnauthorized: async () => {
    apiClient.clearAccessToken()
    window.location.href = "/auth/login"
  },
  onForbidden: async (error) => {
    console.error("Forbidden:", error.message)
  },
  onResponseError: async (error) => {
    console.error("API error:", error.status, error.message, error.data)
  },
})
```

### Example: Add Request Metadata

```ts
apiClient.setHooks({
  onRequest: async (config) => {
    console.log("Starting request:", config.method, config.url)
  },
  onResponse: async (response) => {
    console.log("Response:", response.status, response.config.url)
  },
})
```

## Token Refresh Flow

If a request:

- uses `access_token: true`
- receives `401`
- has not retried already
- does not set `skipAuthRefresh: true`
- and the client has a `refreshAccessToken` handler

then the client will try to refresh the token and replay the request once.

### Configure Refresh Handler

```ts
apiClient.setRefreshHandler(async ({ error, client }) => {
  const refreshToken = localStorage.getItem("refresh_token")

  if (!refreshToken) {
    client.clearAccessToken()
    return null
  }

  const response = await fetch("/auth/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  })

  if (!response.ok) {
    client.clearAccessToken()
    return null
  }

  const data = await response.json()
  client.setAccessToken(data.access_token, "local")
  return data.access_token
})
```

### Skip Refresh For A Specific Request

```ts
await apiClient.get("/api/v1/auth/validate", {
  access_token: true,
  //   skipAuthRefresh: true,
  skipAuthRefresh: false,
})
```

## Logging

Logging is opt-in.

### Enable Logging

```ts
apiClient.setLogger((event) => {
  console.log("[api]", event)
})
```

### Logger Event Shape

```ts
type ApiLoggerEvent = {
  phase: "request" | "response" | "error" | "refresh"
  method?: string
  url?: string
  status?: number
  durationMs?: number
  message?: string
  meta?: Record<string, unknown>
}
```

### Example: Send Logs To Observability Tool

```ts
apiClient.setLogger((event) => {
  myTelemetry.track("api-client", event)
}, true)
```

## Error Handling

All normalized failures are thrown as `ApiClientError`.

### Error Shape

```ts
class ApiClientError extends Error {
  original?: unknown
  status?: number
  data?: unknown
}
```

### Example: Catch A Request Error

```ts
try {
  await apiClient.get<UserProfile>("/api/v1/profile", { access_token: true })
} catch (error) {
  if (error instanceof ApiClientError) {
    console.error(error.status, error.message, error.data)
  }
}
```

## React Query Integration

The client supports React Query in two ways:

1. top-level helpers
2. instance methods on `apiClient`

### Query Options Helper

```ts
import { useQuery } from "@tanstack/react-query"
import apiClient from "@/lib/clients/apiClient"

const usersQueryOptions = apiClient.buildQueryOptions({
  queryKey: ["users"],
  queryFn: () =>
    apiClient.get<UserListResponse>("/api/v1/users", {
      access_token: true,
    }),
  staleTime: 1000 * 60 * 5,
})

export function useUsers() {
  return useQuery(usersQueryOptions)
}
```

### Mutation Options Helper

```ts
import { useMutation } from "@tanstack/react-query"
import apiClient from "@/lib/clients/apiClient"

type CreateRoleBody = {
  name: string
  slug: string
}

const createRoleMutationOptions = apiClient.buildMutationOptions<
  RoleResponse,
  CreateRoleBody
>({
  mutationKey: ["roles", "create"],
  mutationFn: (body) =>
    apiClient.post<RoleResponse, CreateRoleBody>("/api/v1/roles", body, {
      access_token: true,
    }),
})

export function useCreateRole() {
  return useMutation(createRoleMutationOptions)
}
```

### Top-level Helper Variant

```ts
import { createApiQueryOptions } from "@/lib/clients/apiClient"

export const roleListQuery = createApiQueryOptions({
  queryKey: ["roles"],
  queryFn: () =>
    apiClient.get<RoleListResponse>("/api/v1/roles", {
      access_token: true,
    }),
  staleTime: 1000 * 60 * 2,
})
```

## Recommended Service Pattern

Keep feature-specific endpoints in service files and let them use the shared client.

### Example Service

```ts
import apiClient from "@/lib/clients/apiClient"

export const usersApi = {
  list: () =>
    apiClient.get<UserListResponse>("/api/v1/users", {
      access_token: true,
    }),

  getById: (id: string) =>
    apiClient.get<UserResponse>(`/api/v1/users/${id}`, {
      access_token: true,
    }),

  create: (payload: CreateUserBody) =>
    apiClient.post<UserResponse, CreateUserBody>("/api/v1/users", payload, {
      access_token: true,
    }),
}
```

### Example Query Hook Layer

```ts
import { useQuery, useMutation } from "@tanstack/react-query"
import apiClient from "@/lib/clients/apiClient"
import { usersApi } from "@/services/usersApi"

const userKeys = {
  all: ["users"] as const,
  detail: (id: string) => ["users", id] as const,
}

export function useUsers() {
  return useQuery(
    apiClient.buildQueryOptions({
      queryKey: userKeys.all,
      queryFn: usersApi.list,
      staleTime: 1000 * 60 * 5,
    })
  )
}

export function useCreateUser() {
  return useMutation(
    apiClient.buildMutationOptions<UserResponse, CreateUserBody>({
      mutationKey: ["users", "create"],
      mutationFn: usersApi.create,
    })
  )
}
```

## Creating A Separate Client Instance

If one module talks to a completely different backend or needs isolated hooks, create another client.

```ts
import { ApiClient } from "@/lib/clients/apiClient"

export const paymentClient = new ApiClient({
  baseURL: "https://payments.example.com",
  timeout: 20000,
  enableLogging: true,
})

paymentClient.setHooks({
  onResponseError: async (error) => {
    console.error("Payment API error:", error.message)
  },
})
```

## Suggested Initialization Pattern

A good place to centralize runtime client setup is app startup or an auth bootstrap layer.

Example:

```ts
import apiClient from "@/lib/clients/apiClient"

apiClient.setHooks({
  onUnauthorized: async () => {
    apiClient.clearAccessToken()
  },
})

apiClient.setLogger((event) => {
  if (process.env.NODE_ENV === "development") {
    console.log("[api]", event)
  }
}, process.env.NODE_ENV === "development")
```

## Best Practices

- Keep endpoint definitions in feature service files, not in components.
- Use typed request bodies and typed responses everywhere.
- Use `access_token: true` only for protected routes.
- Use `meta` for observability, not for business logic.
- Use hooks for cross-cutting concerns like auth redirects and logging.
- Use React Query builders for cache-friendly, reusable query definitions.
- Prefer creating a new `ApiClient` only when the backend or behavior really differs.

## Current Limitations

- The client supports access-token refresh, but refresh-token persistence and refresh endpoint behavior are application-specific and must be implemented by the app.
- It normalizes API errors, but it does not prescribe UI behavior such as toasts or redirects by default.
- It provides React Query option builders, but it does not automatically create feature hooks for you. That remains a feature-module responsibility.

## Quick Reference

### Methods

```ts
apiClient.get<TResponse>(url, opts?)
apiClient.post<TResponse, TBody>(url, body?, opts?)
apiClient.put<TResponse, TBody>(url, body?, opts?)
apiClient.patch<TResponse, TBody>(url, body?, opts?)
apiClient.delete<TResponse>(url, opts?)
```

### Runtime Controls

```ts
apiClient.setConfig(config)
apiClient.setHooks(hooks)
apiClient.setRefreshHandler(handler)
apiClient.setLogger(logger, enableLogging?)
apiClient.setAccessToken(token, persistence?)
apiClient.clearAccessToken()
apiClient.setBaseURL(url)
apiClient.setDefaultHeader(key, value)
apiClient.getAxiosInstance()
apiClient.buildQueryOptions(config)
apiClient.buildMutationOptions(config)
```

### Top-level Helpers

```ts
createApiQueryOptions(config)
createApiMutationOptions(config)
```
