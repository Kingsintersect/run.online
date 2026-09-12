import { z } from "zod"

export const featureRegistryRecordSchema = z.object({
  key: z
    .string()
    .min(2, "Feature key must be at least 2 characters")
    .max(50, "Feature key is too long")
    .regex(
      /^[a-z][a-z0-9_]*$/,
      "Feature key must be snake_case and start with a letter"
    ),
  label: z.string().min(2, "Label is required").max(100),
  category: z.string().max(50).optional().nullable(),
  dependencies: z.array(z.string().min(1)).default([]),
  defaultEnabled: z.boolean().default(false),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable().optional(),
})

export type FeatureRegistryRecord = z.infer<typeof featureRegistryRecordSchema>

export const upsertFeatureRegistrySchema = featureRegistryRecordSchema.pick({
  key: true,
  label: true,
  category: true,
  dependencies: true,
  defaultEnabled: true,
})

export type UpsertFeatureRegistryPayload = z.infer<
  typeof upsertFeatureRegistrySchema
>

export const featureRegistryListResponseSchema = z.object({
  registry: z.array(featureRegistryRecordSchema),
})

export const featureFlagsResponseSchema = z.object({
  flags: z.record(z.string(), z.boolean()),
})
