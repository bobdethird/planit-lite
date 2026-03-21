import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { listEvents } from "@/lib/store"

export const dynamic = "force-dynamic"

export default function EventsPage() {
  const events = listEvents()

  return (
    <div className="flex min-h-svh flex-col gap-6 px-5 py-6">
      <div className="flex items-center gap-3">
        <Link
          href="/"
          aria-label="Home"
          className="flex h-9 w-9 items-center justify-center rounded-xl text-[#78716C] transition-colors hover:bg-[#F5F5F4]"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="font-editorial text-2xl font-semibold text-[#1C1917]">Events</h1>
          <p className="text-sm text-[#78716C]">
            PlanIt events (in-memory). Vote and schedule from each detail page.
          </p>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="card-shadow rounded-2xl border border-[#E7E5E4] bg-white py-10 text-center text-sm text-[#78716C]">
          No events yet. Plan a video from the home page, then return here.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {events.map((e) => (
            <li key={e.id}>
              <Link href={`/events/${e.id}`}>
                <div className="card-shadow flex flex-col gap-1 rounded-2xl border border-[#E7E5E4] bg-white px-5 py-3 transition-colors hover:bg-[#FAFAF9] sm:flex-row sm:items-center sm:justify-between">
                  <span className="font-medium text-[#1C1917]">{e.itinerary.title}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-[#A8A29E]">
                      {e.id.slice(0, 8)}…
                    </span>
                    <span className="rounded-lg bg-[#F5F5F4] px-2 py-0.5 text-[11px] font-medium text-[#78716C]">
                      {e.status}
                    </span>
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
