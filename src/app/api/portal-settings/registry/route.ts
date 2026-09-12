import { NextResponse } from "next/server"
import {
  listFeatureRegistry,
  upsertFeatureRegistry,
} from "@/lib/feature-flags/flag-store"
import { upsertFeatureRegistrySchema } from "@/schemas/featureRegistry.schema"

function flattenFieldErrors(error: {
  flatten: () => { fieldErrors: Record<string, string[] | undefined> }
}) {
  return error.flatten().fieldErrors
}

export async function GET() {
  const registry = await listFeatureRegistry()
  return NextResponse.json({ registry }, { status: 200 })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = upsertFeatureRegistrySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          fieldErrors: flattenFieldErrors(parsed.error),
        },
        { status: 400 }
      )
    }

    const registry = await listFeatureRegistry()
    const dependencySet = new Set(registry.map((item) => item.key))
    const dependencyErrors: Record<string, string> = {}

    for (const dependency of parsed.data.dependencies) {
      if (!dependencySet.has(dependency) && dependency !== parsed.data.key) {
        dependencyErrors[dependency] =
          `Dependency '${dependency}' does not exist in registry`
      }
    }

    if (Object.keys(dependencyErrors).length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          fieldErrors: Object.fromEntries(
            Object.entries(dependencyErrors).map(([dep, message]) => [
              `dependencies.${dep}`,
              message,
            ])
          ),
        },
        { status: 400 }
      )
    }

    const record = await upsertFeatureRegistry(parsed.data)

    return NextResponse.json(
      {
        success: true,
        registry: record,
      },
      { status: 200 }
    )
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid request payload",
      },
      { status: 400 }
    )
  }
}
