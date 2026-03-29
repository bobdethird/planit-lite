import Link from "next/link"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { getEvent } from "@/lib/store"
import { EventDetail } from "./EventDetail"

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

  return (
    <div className="flex min-h-svh flex-col gap-5 px-4 pb-6" style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 24px)" }}>
      <div className="flex items-center gap-3">
        <Link
          href="/events"
          aria-label="All events"
          className="flex h-9 w-9 items-center justify-center rounded-xl text-[#888] transition-colors hover:bg-[#F5F5F5]"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-black md:text-2xl">
              {event.itinerary.title}
            </h1>
            <span className={
              event.status === "confirmed"
                ? "rounded-3xl bg-[#ECFDF5] px-2.5 py-0.5 text-[11px] font-semibold text-[#10B981]"
                : "rounded-3xl bg-[#FFF2E8] px-2.5 py-0.5 text-[11px] font-semibold text-[#FF6B00]"
            }>
              {event.status === "confirmed" ? "Confirmed"
                : event.status === "voting" ? "Voting"
                : event.status === "quorum_reached" ? "Quorum reached"
                : event.status}
            </span>
          </div>
          <p className="mt-1 text-sm text-[#888]">{event.itinerary.description}</p>
        </div>
      </div>

      <EventDetail initialEvent={event} />
    </div>
  )
}
