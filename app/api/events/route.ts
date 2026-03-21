import { NextRequest, NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"
import { saveEvent, listEvents, getGroup, listGroups } from "@/lib/store"
import type { Event, Group } from "@/lib/schemas"
import { ItineraryFullZodSchema } from "@/lib/zod-schemas"

export async function GET() {
  try {
    const events = listEvents()
    return NextResponse.json({ events })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to list events"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { itinerary: rawItinerary, groupId, group: inlineGroup } = body as {
      itinerary?: unknown
      groupId?: string
      group?: Group
    }

    if (!rawItinerary) {
      return NextResponse.json({ error: "Missing itinerary" }, { status: 400 })
    }

    const itineraryParsed = ItineraryFullZodSchema.safeParse(rawItinerary)
    if (!itineraryParsed.success) {
      return NextResponse.json(
        {
          error: "Invalid itinerary",
          issues: itineraryParsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      )
    }
    const itinerary = itineraryParsed.data

    let group: Group | undefined
    if (inlineGroup) {
      group = inlineGroup
    } else {
      group = groupId ? getGroup(groupId) : listGroups()[0]
    }

    if (!group) {
      return NextResponse.json({ error: "No group found" }, { status: 400 })
    }

    const event: Event = {
      id: uuidv4(),
      itinerary,
      group,
      votes: [],
      quorum_threshold: 0.6,
      status: "voting",
      created_at: new Date().toISOString(),
    }

    saveEvent(event)

    return NextResponse.json({ event })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create event"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
