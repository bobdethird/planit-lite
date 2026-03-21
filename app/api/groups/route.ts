import { NextResponse } from "next/server"
import { listGroups } from "@/lib/store"

export async function GET() {
  try {
    const groups = listGroups()
    return NextResponse.json({ groups })
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to list groups"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
