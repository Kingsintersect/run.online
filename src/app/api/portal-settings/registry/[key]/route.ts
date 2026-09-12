import { NextRequest, NextResponse } from "next/server"
import { softDeleteFeatureRegistry } from "@/lib/feature-flags/flag-store"

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ key: string }> }
) {
  const { key } = await context.params
  const deleted = await softDeleteFeatureRegistry(key)

  if (!deleted) {
    return NextResponse.json(
      {
        success: false,
        error: `Feature '${key}' not found`,
      },
      { status: 404 }
    )
  }

  return NextResponse.json(
    {
      success: true,
      message: `Feature '${key}' soft-deleted successfully`,
    },
    { status: 200 }
  )
}
