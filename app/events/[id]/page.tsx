import Link from "next/link"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
    description: (event.itinerary.description || "Planit event").slice(0, 160),
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
    <div className="mx-auto flex min-h-svh max-w-2xl flex-col gap-6 p-6 md:p-10">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link href="/events" aria-label="All events">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-heading text-xl font-bold tracking-tight md:text-2xl">
              {itinerary.title}
            </h1>
            <Badge>{event.status}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{itinerary.description}</p>
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 py-4 text-sm">
          <div>
            <span className="text-muted-foreground">Where</span>
            <p className="font-medium">{itinerary.venue_name}</p>
            <p className="text-xs text-muted-foreground">{itinerary.venue_address}</p>
          </div>
          <div className="flex flex-wrap gap-4 text-xs">
            <span>
              <span className="text-muted-foreground">Cost </span>
              {itinerary.cost_per_person}
            </span>
            <span>
              <span className="text-muted-foreground">Duration </span>
              {itinerary.duration_hrs}h
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Group</span>
            <p>{event.group.name}</p>
            <ul className="mt-1 text-xs text-muted-foreground">
              {event.group.members.map((m) => (
                <li key={m.id}>
                  {m.name} — {m.phone}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <span className="text-muted-foreground">Agenda</span>
            <ul className="mt-1 list-inside list-disc text-xs">
              {itinerary.agenda.map((a, i) => (
                <li key={i}>
                  +{a.time_offset_min}m — {a.activity}
                </li>
              ))}
            </ul>
          </div>

          <EventActions eventId={event.id} initialEvent={event} />
        </CardContent>
      </Card>
    </div>
  )
}
