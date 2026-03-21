"use client"

import { useState, useCallback } from "react"
import type { Event } from "@/lib/schemas"
import { Loader2, Link2, Copy, ExternalLink } from "lucide-react"

const DEMO_PHONES = [
  { label: "Alex", phone: "+14155551234" },
  { label: "Maya", phone: "+14155555678" },
  { label: "Jordan", phone: "+14155559012" },
  { label: "Sam", phone: "+14155553456" },
]

export function EventActions({
  eventId,
  initialEvent,
}: {
  eventId: string
  initialEvent: Event
}) {
  const [event, setEvent] = useState(initialEvent)
  const [phone, setPhone] = useState(DEMO_PHONES[0].phone)
  const [voteLoading, setVoteLoading] = useState(false)
  const [scheduleLoading, setScheduleLoading] = useState(false)
  const [scheduleTime, setScheduleTime] = useState("")
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const copyText = useCallback(async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(label)
      setTimeout(() => setCopied(null), 2000)
    } catch {
      setError("Could not copy to clipboard")
    }
  }, [])

  async function submitVote(v: "yes" | "no") {
    setVoteLoading(true)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: eventId, phone, vote: v }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Vote failed"); return }
      setMessage(`Vote recorded. Yes: ${data.vote_count.yes}/${data.vote_count.members}. Quorum: ${data.quorum_reached ? "yes" : "no"}`)
      const evRes = await fetch(`/api/events/${encodeURIComponent(eventId)}`)
      const evData = await evRes.json()
      if (evData.event) setEvent(evData.event)
    } catch { setError("Network error") }
    finally { setVoteLoading(false) }
  }

  async function runSchedule(mode: "auto" | "confirm") {
    if (mode === "confirm" && !scheduleTime.trim()) {
      setError("Enter an ISO datetime (e.g. 2026-03-28T19:00:00.000Z) to confirm a specific time.")
      return
    }
    setScheduleLoading(true)
    setError(null)
    setMessage(null)
    try {
      const body = mode === "confirm"
        ? { event_id: eventId, scheduled_time: scheduleTime.trim() }
        : { event_id: eventId }
      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Schedule failed"); return }
      setMessage(data.message === "Already scheduled" ? "Already confirmed." : `Scheduled: ${data.scheduled_time}`)
      const evRes = await fetch(`/api/events/${encodeURIComponent(eventId)}`)
      const evData = await evRes.json()
      if (evData.event) setEvent(evData.event)
    } catch { setError("Network error") }
    finally { setScheduleLoading(false) }
  }

  const yesVotes = event.votes.filter((v) => v.vote === "yes").length
  const members = event.group.members.length
  const quorumMet = yesVotes / members >= event.quorum_threshold

  const pageUrl = typeof window !== "undefined"
    ? `${window.location.origin}/events/${eventId}`
    : ""

  return (
    <div className="flex flex-col gap-4 border-t border-[#E7E5E4] pt-4">
      <div className="flex flex-wrap gap-2">
        {[
          { label: "link", text: pageUrl, icon: Link2, display: "Copy link" },
          { label: "id", text: eventId, icon: Copy, display: "Copy event ID" },
        ].map(({ label, text, icon: Icon, display }) => (
          <button
            key={label}
            type="button"
            className="inline-flex items-center gap-1.5 rounded-[10px] border border-[#E7E5E4] px-3 py-1.5 text-xs font-medium text-[#1C1917] transition-colors hover:bg-[#F5F5F4]"
            onClick={() => copyText(label, text)}
          >
            <Icon className="h-3.5 w-3.5" />
            {copied === label ? "Copied!" : display}
          </button>
        ))}
        {event.itinerary.venue_maps_url && (
          <a
            href={event.itinerary.venue_maps_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-[10px] border border-[#E7E5E4] px-3 py-1.5 text-xs font-medium text-[#1C1917] transition-colors hover:bg-[#F5F5F4]"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Maps
          </a>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-[#1C1917]">Vote (demo phones)</h3>
        <p className="text-xs text-[#78716C]">
          {yesVotes}/{members} yes · quorum {Math.round(event.quorum_threshold * 100)}% · {quorumMet ? "met" : "not met"}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          className="h-9 rounded-xl border border-[#E7E5E4] bg-white px-2 text-xs text-[#1C1917]"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        >
          {DEMO_PHONES.map((p) => (
            <option key={p.phone} value={p.phone}>
              {p.label} ({p.phone})
            </option>
          ))}
        </select>
        <button
          disabled={voteLoading}
          onClick={() => submitVote("yes")}
          className="inline-flex items-center gap-1 rounded-[10px] bg-[#1C1917] px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-[#292524] disabled:opacity-50"
        >
          {voteLoading && <Loader2 className="h-3 w-3" style={{ animation: "spin 1s linear infinite" }} />}
          Yes
        </button>
        <button
          disabled={voteLoading}
          onClick={() => submitVote("no")}
          className="inline-flex items-center rounded-[10px] border border-[#E7E5E4] px-3 py-1.5 text-xs font-medium text-[#1C1917] transition-colors hover:bg-[#F5F5F4] disabled:opacity-50"
        >
          No
        </button>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-[#1C1917]">Schedule</h3>
        <p className="mb-2 text-xs text-[#78716C]">
          Auto-pick needs quorum. Or set an ISO time and confirm (works while voting).
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <input
            className="h-9 min-w-0 flex-1 rounded-xl border border-[#E7E5E4] bg-white px-3 font-mono text-xs text-[#1C1917] outline-none placeholder:text-[#A8A29E] focus:ring-2 focus:ring-[#F97316]/20"
            placeholder="2026-03-28T19:00:00.000Z"
            value={scheduleTime}
            onChange={(e) => setScheduleTime(e.target.value)}
          />
          <button
            disabled={scheduleLoading || !scheduleTime.trim()}
            onClick={() => runSchedule("confirm")}
            className="inline-flex items-center gap-1 rounded-[10px] bg-[#F5F5F4] px-3 py-1.5 text-xs font-medium text-[#1C1917] transition-colors hover:bg-[#E7E5E4] disabled:opacity-50"
          >
            {scheduleLoading && <Loader2 className="h-3 w-3" style={{ animation: "spin 1s linear infinite" }} />}
            Confirm time
          </button>
          <button
            disabled={scheduleLoading || !quorumMet}
            onClick={() => runSchedule("auto")}
            title={!quorumMet ? "Reach quorum first for auto-schedule" : ""}
            className="inline-flex items-center rounded-[10px] border border-[#E7E5E4] px-3 py-1.5 text-xs font-medium text-[#1C1917] transition-colors hover:bg-[#F5F5F4] disabled:opacity-50"
          >
            Auto slot
          </button>
        </div>
      </div>

      {message && <p className="text-xs font-medium text-[#10B981]">{message}</p>}
      {error && <p className="text-xs font-medium text-[#EF4444]">{error}</p>}

      <p className="text-[11px] text-[#A8A29E]">
        Status: <code className="rounded-md bg-[#F5F5F4] px-1">{event.status}</code>
        {event.scheduled_time && (
          <> · <code className="rounded-md bg-[#F5F5F4] px-1">{event.scheduled_time}</code></>
        )}
      </p>
    </div>
  )
}
