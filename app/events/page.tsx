import Link from "next/link"
import { ArrowLeft, MapPin, CalendarCheck } from "lucide-react"
import { listEvents } from "@/lib/store"

export const dynamic = "force-dynamic"

const STATUS_STYLE: Record<string, string> = {
  confirmed: "bg-[#ECFDF5] text-[#10B981]",
  quorum_reached: "bg-[#FFF2E8] text-[#FF6B00]",
  voting: "bg-[#FFF2E8] text-[#FF6B00]",
}

const STATUS_LABEL: Record<string, string> = {
  confirmed: "Confirmed",
  quorum_reached: "Quorum reached",
  voting: "Voting",
  pending: "Pending",
}

export default function EventsPage() {
  const events = listEvents()

  return (
    <div className="flex min-h-svh flex-col gap-6 bg-[#F5F5F5] px-4 pb-6" style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 24px)" }}>
      <div className="flex items-center gap-3">
        <Link
          href="/"
          aria-label="Home"
          className="flex h-9 w-9 items-center justify-center rounded-xl text-[#888] transition-colors hover:bg-white"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-black">Events</h1>
          <p className="text-sm text-[#888]">Your planned events and itineraries.</p>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="card-shadow rounded-2xl bg-white py-10 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F5F5F5]">
            <CalendarCheck className="h-6 w-6 text-[#888]" />
          </div>
          <p className="text-sm font-semibold text-black">No events yet</p>
          <p className="mt-1 text-xs text-[#888]">Share a TikTok reel from the home page to get started.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {events.map((e) => (
            <li key={e.id}>
              <Link href={`/events/${e.id}`}>
                <div className="card-shadow rounded-2xl bg-white p-5 transition-colors hover:bg-[#FAFAFA]">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-black">{e.itinerary.title}</p>
                      <div className="mt-1 flex items-center gap-1.5 text-xs text-[#888]">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">{e.itinerary.venue_name}</span>
                      </div>
                    </div>
                    <span className={`shrink-0 rounded-3xl px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[e.status] || "bg-[#F5F5F5] text-[#888]"}`}>
                      {STATUS_LABEL[e.status] || e.status}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-[11px] text-[#888]">
                    <span>{e.group.name} · {e.group.members.length} members</span>
                    <span>{e.votes.filter((v) => v.vote === "yes").length}/{e.group.members.length} yes</span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
