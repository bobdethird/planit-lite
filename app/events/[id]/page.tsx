import Link from "next/link"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { getEvent } from "@/lib/store"
import { EventActions } from "./EventActions"

export const dynamic = "force-dynamic"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const event = getEvent(id)
  if (!event) return { title: "Event" }
  return {
    title: event.itinerary.title,
    description: (event.itinerary.description || "PlanIt event").slice(0, 160),
  }
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const event = getEvent(id)
  if (!event) notFound()

  const { itinerary } = event

  return (
    <div className="flex min-h-svh flex-col gap-6 px-5 py-6">
      <div className="flex items-center gap-3">
        <Link
          href="/events"
          aria-label="All events"
          className="flex h-9 w-9 items-center justify-center rounded-xl text-[#78716C] transition-colors hover:bg-[#F5F5F4]"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-editorial text-xl font-semibold text-[#1C1917] md:text-2xl">
              {itinerary.title}
            </h1>
            <span className="rounded-lg bg-[#F5F5F4] px-2.5 py-0.5 text-[11px] font-semibold text-[#78716C]">
              {event.status}
            </span>
          </div>
          <p className="text-sm text-[#78716C]">{itinerary.description}</p>
        </div>
      </div>

      <div className="card-shadow flex flex-col gap-3 rounded-2xl border border-[#E7E5E4] bg-white px-5 py-4 text-sm">
        <div>
          <span className="text-xs font-medium uppercase tracking-wide text-[#A8A29E]">Where</span>
          <p className="font-medium text-[#1C1917]">{itinerary.venue_name}</p>
          <p className="text-xs text-[#78716C]">{itinerary.venue_address}</p>
        </div>
        <div className="flex flex-wrap gap-4 text-xs">
          <span>
            <span className="text-[#A8A29E]">Cost </span>
            <span className="font-medium text-[#1C1917]">{itinerary.cost_per_person}</span>
          </span>
          <span>
            <span className="text-[#A8A29E]">Duration </span>
            <span className="font-medium text-[#1C1917]">{itinerary.duration_hrs}h</span>
          </span>
        </div>
        <div>
          <span className="text-xs font-medium uppercase tracking-wide text-[#A8A29E]">Group</span>
          <p className="font-medium text-[#1C1917]">{event.group.name}</p>
          <ul className="mt-1 text-xs text-[#78716C]">
            {event.group.members.map((m) => (
              <li key={m.id}>
                {m.name} — {m.phone}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <span className="text-xs font-medium uppercase tracking-wide text-[#A8A29E]">Agenda</span>
          <ul className="mt-1 list-inside list-disc text-xs text-[#78716C]">
            {itinerary.agenda.map((a, i) => (
              <li key={i}>
                +{a.time_offset_min}m — {a.activity}
              </li>
            ))}
          </ul>
        </div>

        <EventActions eventId={event.id} initialEvent={event} />
      </div>
    </div>
  )
}
