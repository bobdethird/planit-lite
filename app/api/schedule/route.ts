import { NextRequest, NextResponse } from "next/server"
import { getEvent, saveEvent } from "@/lib/store"
import type { Event } from "@/lib/schemas"

/**
 * Scheduling — picks a slot and/or writes Google Calendar events.
 * - Auto mode (no `scheduled_time`): uses quorum + suggested_date_range (needs quorum_reached or voting).
 * - Confirm mode (`scheduled_time`): sets that time and confirms (typical after quorum).
 * - Idempotent: if already `confirmed` with a time, returns existing state (optionally backfills GCal).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { event_id, scheduled_time } = body as {
      event_id?: string
      scheduled_time?: string
    }

    if (!event_id) {
      return NextResponse.json({ error: "Missing event_id" }, { status: 400 })
    }

    const event = getEvent(event_id)
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }

    // Already finalized — return + try to backfill Calendar rows if needed
    if (event.status === "confirmed" && event.scheduled_time) {
      await ensureGCalEvents(event)
      saveEvent(event)
      return NextResponse.json({
        scheduled_time: event.scheduled_time,
        event_status: event.status,
        calendar_event_ids: event.gcal_event_ids ?? [],
        confirmed_members: confirmedMemberNames(event),
        message: "Already scheduled",
      })
    }

    const canSchedule =
      event.status === "quorum_reached" ||
      event.status === "voting" ||
      event.status === "pending"

    if (!canSchedule) {
      return NextResponse.json(
        {
          error: `Cannot schedule event in status: ${event.status}. Open voting or reach quorum first.`,
        },
        { status: 400 },
      )
    }

    let scheduled: Date
    if (scheduled_time) {
      scheduled = new Date(scheduled_time)
      if (Number.isNaN(scheduled.getTime())) {
        return NextResponse.json(
          { error: "Invalid scheduled_time" },
          { status: 400 },
        )
      }
    } else {
      if (event.status !== "quorum_reached") {
        return NextResponse.json(
          {
            error:
              "Auto-schedule needs quorum (≥60% yes). Or pass scheduled_time to pick a specific slot.",
          },
          { status: 400 },
        )
      }
      const start = new Date(event.itinerary.suggested_date_range.start)
      const end = new Date(event.itinerary.suggested_date_range.end)
      scheduled = findBestSlot(start, end)
    }

    event.scheduled_time = scheduled.toISOString()

    await ensureGCalEvents(event)

    event.status = "confirmed"
    saveEvent(event)

    return NextResponse.json({
      scheduled_time: event.scheduled_time,
      event_status: event.status,
      calendar_event_ids: event.gcal_event_ids ?? [],
      confirmed_members: confirmedMemberNames(event),
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Scheduling failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function confirmedMemberNames(event: Event | undefined): string[] {
  if (!event) return []
  return event.group.members
    .filter((m) =>
      event.votes.some((v) => v.user_id === m.id && v.vote === "yes"),
    )
    .map((m) => m.name)
}

/** Create GCal events for yes-voters who have `gcal_token`. Returns new IDs (may merge with existing). */
async function ensureGCalEvents(event: Event): Promise<string[]> {
  const existing = [...(event.gcal_event_ids ?? [])]

  const scheduled = new Date(event.scheduled_time!)
  const confirmedMembers = event.group.members.filter((m) =>
    event.votes.some((v) => v.user_id === m.id && v.vote === "yes"),
  )

  const newIds: string[] = []

  for (const member of confirmedMembers) {
    if (!member.gcal_token) continue

    try {
      const calEventId = await createGCalEvent(
        member.gcal_token,
        event.itinerary.title,
        event.itinerary.description,
        scheduled,
        event.itinerary.duration_hrs,
        event.itinerary.venue_address,
        event.id,
      )
      newIds.push(calEventId)
    } catch {
      // Continue if one calendar fails
    }
  }

  if (newIds.length > 0) {
    event.gcal_event_ids = [...existing, ...newIds]
  }

  return event.gcal_event_ids ?? []
}

function findBestSlot(start: Date, end: Date): Date {
  const candidate = new Date(start)
  const day = candidate.getDay()
  const daysUntilSaturday = (6 - day + 7) % 7 || 7
  candidate.setDate(candidate.getDate() + daysUntilSaturday)
  candidate.setHours(19, 0, 0, 0)

  if (candidate > end) return start

  return candidate
}

async function createGCalEvent(
  accessToken: string,
  title: string,
  description: string,
  startTime: Date,
  durationHrs: number,
  location: string,
  eventId: string,
): Promise<string> {
  const endTime = new Date(startTime.getTime() + durationHrs * 60 * 60 * 1000)

  const body = {
    summary: title,
    description: `${description}\n\nPlanit event: ${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/events/${eventId}`,
    location,
    start: {
      dateTime: startTime.toISOString(),
      timeZone: "America/Los_Angeles",
    },
    end: {
      dateTime: endTime.toISOString(),
      timeZone: "America/Los_Angeles",
    },
  }

  const res = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  )

  if (!res.ok) {
    throw new Error(`GCal API error: ${res.status}`)
  }

  const data = await res.json()
  return data.id as string
}
