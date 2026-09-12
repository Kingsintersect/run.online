"use client"

import { useEffect, useMemo } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Save, Workflow } from "lucide-react"
import { toast } from "sonner"
import SectionCard from "@/components/custom/SectionCard"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  useFeatureFlags,
  useSaveFeatureFlags,
  buildSavePayload,
} from "@/hooks/useFeatureFlags"
import { useFeatureRegistry } from "@/hooks/useFeatureRegistry"
import {
  featureFlagMapSchema,
  type FeatureFlagMap,
  validateFlags,
} from "@/schemas/featureFlags.schema"
import { ApiClientError } from "@/lib/clients/apiClient"

const INSTANCE_ID = "default"

type FormShape = FeatureFlagMap

type ApiErrorBody = {
  message?: string
  fieldErrors?: Record<string, string[] | undefined>
}

function parseApiError(error: unknown): ApiErrorBody {
  if (
    !(error instanceof ApiClientError) ||
    !error.data ||
    typeof error.data !== "object"
  ) {
    return {}
  }

  const data = error.data as { message?: unknown; fieldErrors?: unknown }
  const body: ApiErrorBody = {}

  if (typeof data.message === "string") body.message = data.message
  if (data.fieldErrors && typeof data.fieldErrors === "object") {
    body.fieldErrors = data.fieldErrors as Record<string, string[] | undefined>
  }

  return body
}

export default function PortalSettingsPage() {
  const { data, isLoading } = useFeatureFlags(INSTANCE_ID)
  const { data: registry = [], isLoading: isRegistryLoading } =
    useFeatureRegistry()
  const saveMutation = useSaveFeatureFlags(INSTANCE_ID)

  const form = useForm<FormShape>({
    resolver: zodResolver(featureFlagMapSchema),
    defaultValues: data?.flags,
    mode: "onChange",
  })

  useEffect(() => {
    if (!data?.flags || registry.length === 0) return
    const merged = registry.reduce<Record<string, boolean>>((acc, feature) => {
      acc[feature.key] = data.flags[feature.key] ?? feature.defaultEnabled
      return acc
    }, {})
    form.reset(merged)
  }, [data?.flags, registry, form])

  const featuresByCategory = useMemo(() => {
    return registry.reduce<Record<string, typeof registry>>((acc, feature) => {
      const key = feature.category?.trim() || "General"
      if (!acc[key]) acc[key] = []
      acc[key]!.push(feature)
      return acc
    }, {})
  }, [registry])

  const onSubmit = form.handleSubmit(async (values) => {
    form.clearErrors()
    const validation = validateFlags(values, registry)

    if (!validation.isValid) {
      for (const [key, messages] of Object.entries(validation.fieldErrors)) {
        const firstMessage = messages?.[0]
        if (!firstMessage) continue
        form.setError(key, {
          type: "manual",
          message: firstMessage,
        })
      }
      form.setError("root.serverError", {
        type: "manual",
        message: "Resolve the highlighted dependency issues before saving.",
      })
      return
    }

    try {
      await saveMutation.mutateAsync(buildSavePayload(INSTANCE_ID, values))
      toast.success("Portal feature settings saved.")
    } catch (error: unknown) {
      const parsed = parseApiError(error)
      if (parsed.fieldErrors) {
        for (const [key, messages] of Object.entries(parsed.fieldErrors)) {
          const firstMessage = messages?.[0]
          if (!firstMessage) continue
          form.setError(key, {
            type: "server",
            message: firstMessage,
          })
        }
      }

      form.setError("root.serverError", {
        type: "server",
        message:
          parsed.message ??
          (error instanceof Error ? error.message : "Failed to save settings."),
      })
    }
  })

  if (isLoading || isRegistryLoading) {
    return (
      <div className="mx-auto h-full min-h-0 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex h-full items-center justify-center">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex h-full min-h-0 flex-col gap-4 overflow-hidden px-4 py-6 sm:px-6 lg:px-8">
      <div className="shrink-0 space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Portal Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Toggle portal capabilities per deployment instance. Dependency checks
          run before save.
        </p>
      </div>

      <SectionCard
        className="flex min-h-0 flex-1 flex-col"
        title="Feature Registry"
        icon={Workflow}
        actions={
          <Button onClick={onSubmit} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? (
              <Loader2
                className="size-4 animate-spin"
                data-icon="inline-start"
              />
            ) : (
              <Save className="size-4" data-icon="inline-start" />
            )}
            Save Changes
          </Button>
        }
      >
        <form
          className="max-h-[calc(100dvh-18rem)] space-y-6 overflow-y-auto pr-1"
          onSubmit={(event) => event.preventDefault()}
        >
          {form.formState.errors.root?.serverError?.message && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              {form.formState.errors.root.serverError.message}
            </div>
          )}

          {Object.entries(featuresByCategory).map(([category, features]) => (
            <div key={category} className="space-y-3">
              <h2 className="text-sm font-semibold text-foreground">
                {category}
              </h2>

              <div className="divide-y divide-border rounded-xl border border-border">
                {features.map((feature) => {
                  const fieldError = form.formState.errors[feature.key]?.message
                  const dependencies = feature.dependencies ?? []

                  return (
                    <div
                      key={feature.key}
                      className="flex items-start gap-3 p-3 sm:p-4"
                    >
                      <Controller
                        control={form.control}
                        name={feature.key}
                        render={({ field }) => (
                          <Checkbox
                            checked={!!field.value}
                            disabled={saveMutation.isPending}
                            onCheckedChange={(checked) =>
                              field.onChange(checked === true)
                            }
                            aria-invalid={!!fieldError}
                          />
                        )}
                      />

                      <div className="flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium text-foreground">
                            {feature.label}
                          </p>
                        </div>

                        {dependencies.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Depends on: {dependencies.join(", ")}
                          </p>
                        )}

                        {fieldError && (
                          <p className="text-xs text-destructive">
                            {fieldError}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </form>
      </SectionCard>
    </div>
  )
}
