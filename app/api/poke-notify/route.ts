import { NextRequest, NextResponse } from "next/server"
import { getEvent } from "@/lib/store"
import type { Member, Event } from "@/lib/schemas"

const POKE_API_URL = "https://poke.com/api/v1/inbound/api-message"

async function sendPoke(
  member: Member,
  message: string,
): Promise<{ name: string; success: boolean; error?: string }> {
  const envKey = member.pokeEnvKey || `POKE_API_KEY_${member.name.toUpperCase()}`
  const apiKey = process.env[envKey]

  if (!apiKey) {
    return { name: member.name, success: false, error: `${envKey} is not configured` }
  }

  try {
    const res = await fetch(POKE_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => null)
      return { name: member.name, success: false, error: `Poke API ${res.status}: ${JSON.stringify(body)}` }
    }

    return { name: member.name, success: true }
  } catch (err) {
    return {
      name: member.name,
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    }
  }
}

function buildMessage(event: Event, member: Member): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  const agenda = event.itinerary.agenda
    .map((a) => `  • +${a.time_offset_min}m — ${a.activity}${a.location_name ? ` @ ${a.location_name}` : ""}`)
    .join("\n")

  const others = event.group.members
    .filter((m) => m.id !== member.id)
    .map((m) => m.name)
    .join(" and ")

  return [
    `Hey ${member.name}! You've been invited to a new plan on PlanIt.`,
    "",
    `📍 ${event.itinerary.title}`,
    `📎 ${event.itinerary.venue_name} — ${event.itinerary.venue_address}`,
    `💰 ${event.itinerary.cost_per_person}/person · ${event.itinerary.duration_hrs}h`,
    "",
    "Agenda:",
    agenda,
    "",
    `The group: ${others}`,
    "",
    `Vote here: ${baseUrl}/events/${event.id}`,
    "",
    `Please check my Google Calendar and help me figure out when I'm free for ${event.itinerary.duration_hrs} hours. Once we agree on a time, use the PlanIt MCP integration to submit my availability.`,
    "",
    `MCP server: ${baseUrl}/api/mcp`,
  ].join("\n")
}

export async function POST(request: NextRequest) {
  try {
    const { event_id } = (await request.json()) as { event_id?: string }

    if (!event_id) {
      return NextResponse.json({ error: "Missing event_id" }, { status: 400 })
    }

    const event = getEvent(event_id)
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }

    const results = await Promise.all(
      event.group.members.map((m) => sendPoke(m, buildMessage(event, m))),
    )

    const succeeded = results.filter((r) => r.success).length
    const failed = results.filter((r) => !r.success).length

    return NextResponse.json({ results, succeeded, failed })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Poke notification failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
