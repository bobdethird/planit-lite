import { NextRequest, NextResponse } from "next/server"
import { getEvent, deleteEvent } from "@/lib/store"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const event = getEvent(id)
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }
    return NextResponse.json({ event })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to get event"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * Remove an event from the in-memory store (dev / admin cleanup).
 * Set `x-planit-admin-secret` to match `PLANIT_ADMIN_SECRET` in production.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const secret = process.env.PLANIT_ADMIN_SECRET
    if (secret) {
      const header = request.headers.get("x-planit-admin-secret")
      if (header !== secret) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    }

    const { id } = await params
    const existed = deleteEvent(id)
    if (!existed) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }
    return NextResponse.json({ success: true, id })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete event"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
