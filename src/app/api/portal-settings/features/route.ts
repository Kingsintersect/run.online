import { NextRequest, NextResponse } from "next/server"
import {
  featureFlagMapSchema,
  featureFlagPayloadSchema,
  validateFlags,
} from "@/schemas/featureFlags.schema"
import {
  getFeatureFlagRow,
  listFeatureRegistry,
  saveFeatureFlagRow,
} from "@/lib/feature-flags/flag-store"

function flattenFieldErrors(error: {
  flatten: () => { fieldErrors: Record<string, string[] | undefined> }
}) {
  return error.flatten().fieldErrors
}

export async function GET(request: NextRequest) {
  const instanceId = request.nextUrl.searchParams.get("instanceId") ?? "default"
  const row = await getFeatureFlagRow(instanceId)

  const registry = await listFeatureRegistry()
  const flags = registry.reduce<Record<string, boolean>>((acc, item) => {
    acc[item.key] = row.flags[item.key] ?? item.defaultEnabled
    return acc
  }, {})

  return NextResponse.json(
    {
      flags,
    },
    { status: 200 }
  )
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = featureFlagPayloadSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "Invalid feature flag payload.",
          fieldErrors: flattenFieldErrors(parsed.error),
        },
        { status: 400 }
      )
    }

    const mapParsed = featureFlagMapSchema.safeParse(parsed.data.flags)
    if (!mapParsed.success) {
      return NextResponse.json(
        {
          message: "Invalid feature map.",
          fieldErrors: flattenFieldErrors(mapParsed.error),
        },
        { status: 400 }
      )
    }

    const registry = await listFeatureRegistry()
    const validation = validateFlags(mapParsed.data, registry)
    if (!validation.isValid) {
      return NextResponse.json(
        {
          message: "Feature dependency validation failed.",
          fieldErrors: validation.fieldErrors,
        },
        { status: 409 }
      )
    }

    const row = await saveFeatureFlagRow(parsed.data.instanceId, mapParsed.data)

    return NextResponse.json(
      {
        success: true,
        flags: row.flags,
      },
      { status: 200 }
    )
  } catch {
    return NextResponse.json(
      {
        message: "Invalid request payload.",
      },
      { status: 400 }
    )
  }
}
