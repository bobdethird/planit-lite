"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
      if (!res.ok) {
        setError(data.error || "Vote failed")
        return
      }
      setMessage(
        `Vote recorded. Yes: ${data.vote_count.yes}/${data.vote_count.members}. Quorum: ${data.quorum_reached ? "yes" : "no"}`,
      )
      const evRes = await fetch(`/api/events/${encodeURIComponent(eventId)}`)
      const evData = await evRes.json()
      if (evData.event) setEvent(evData.event)
    } catch {
      setError("Network error")
    } finally {
      setVoteLoading(false)
    }
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
      const body =
        mode === "confirm"
          ? { event_id: eventId, scheduled_time: scheduleTime.trim() }
          : { event_id: eventId }

      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Schedule failed")
        return
      }
      setMessage(
        data.message === "Already scheduled"
          ? "Already confirmed."
          : `Scheduled: ${data.scheduled_time}`,
      )
      const evRes = await fetch(`/api/events/${encodeURIComponent(eventId)}`)
      const evData = await evRes.json()
      if (evData.event) setEvent(evData.event)
    } catch {
      setError("Network error")
    } finally {
      setScheduleLoading(false)
    }
  }

  const yesVotes = event.votes.filter((v) => v.vote === "yes").length
  const members = event.group.members.length
  const quorumMet = yesVotes / members >= event.quorum_threshold

  const pageUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/events/${eventId}`
      : ""

  return (
    <div className="flex flex-col gap-4 border-t pt-4">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-xs"
          onClick={() => copyText("link", pageUrl)}
        >
          <Link2 className="size-3.5" />
          {copied === "link" ? "Copied!" : "Copy link"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-xs"
          onClick={() => copyText("id", eventId)}
        >
          <Copy className="size-3.5" />
          {copied === "id" ? "Copied!" : "Copy event ID"}
        </Button>
        {event.itinerary.venue_maps_url && (
          <Button variant="outline" size="sm" className="text-xs" asChild>
            <a
              href={event.itinerary.venue_maps_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="size-3.5" />
              Maps
            </a>
          </Button>
        )}
      </div>

      <div>
        <h3 className="text-sm font-medium">Vote (demo phones)</h3>
        <p className="text-xs text-muted-foreground">
          {yesVotes}/{members} yes · quorum {Math.round(event.quorum_threshold * 100)}% ·{" "}
          {quorumMet ? "met" : "not met"}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          className="h-9 rounded-md border border-input bg-background px-2 text-xs"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        >
          {DEMO_PHONES.map((p) => (
            <option key={p.phone} value={p.phone}>
              {p.label} ({p.phone})
            </option>
          ))}
        </select>
        <Button
          size="sm"
          disabled={voteLoading}
          onClick={() => submitVote("yes")}
        >
          {voteLoading ? <Loader2 className="animate-spin" /> : null} Yes
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={voteLoading}
          onClick={() => submitVote("no")}
        >
          No
        </Button>
      </div>

      <div>
        <h3 className="text-sm font-medium">Schedule</h3>
        <p className="mb-2 text-xs text-muted-foreground">
          Auto-pick needs quorum. Or set an ISO time and confirm (works while voting).
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <Input
            className="font-mono text-xs"
            placeholder="2026-03-28T19:00:00.000Z"
            value={scheduleTime}
            onChange={(e) => setScheduleTime(e.target.value)}
          />
          <Button
            size="sm"
            variant="secondary"
            disabled={scheduleLoading || !scheduleTime.trim()}
            onClick={() => runSchedule("confirm")}
          >
            {scheduleLoading ? <Loader2 className="animate-spin" /> : null}
            Confirm time
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={scheduleLoading || !quorumMet}
            onClick={() => runSchedule("auto")}
            title={!quorumMet ? "Reach quorum first for auto-schedule" : ""}
          >
            Auto slot
          </Button>
        </div>
      </div>

      {message && (
        <p className="text-xs text-emerald-700 dark:text-emerald-400">{message}</p>
      )}
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      <p className="text-[11px] text-muted-foreground">
        Status: <code className="rounded bg-muted px-1">{event.status}</code>
        {event.scheduled_time && (
          <>
            {" "}
            · <code className="rounded bg-muted px-1">{event.scheduled_time}</code>
          </>
        )}
      </p>
    </div>
  )
}
