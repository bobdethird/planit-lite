"use client"

import { useState, useCallback } from "react"
import type { Event } from "@/lib/schemas"
import { ItineraryExplorer } from "@/components/ItineraryExplorer"
import {
  Link2,
  Copy,
  ExternalLink,
  CheckCircle,
  XCircle,
  CalendarCheck,
  RefreshCw,
  Loader2,
  Send,
  AlertCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"

const AVATAR_COLORS = ["#FF6B00", "#3B82F6", "#10B981", "#8B5CF6", "#EC4899", "#EAB308"]

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit",
  })
}

export function EventDetail({ initialEvent }: { initialEvent: Event }) {
  const [event, setEvent] = useState(initialEvent)
  const [copied, setCopied] = useState<string | null>(null)
  const [pokeState, setPokeState] = useState<"idle" | "sending" | "sent" | "error">("idle")
  const [voteLoading, setVoteLoading] = useState(false)

  const { itinerary } = event
  const yesVotes = event.votes.filter((v) => v.vote === "yes").length
  const total = event.group.members.length
  const pct = Math.min(100, (yesVotes / total) * 100)
  const quorum = Math.ceil(total * event.quorum_threshold)

  const refreshEvent = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${event.id}`)
      const data = await res.json()
      if (data.event) setEvent(data.event)
    } catch { /* ignore */ }
  }, [event.id])

  const copyText = useCallback(async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(label)
      setTimeout(() => setCopied(null), 2000)
    } catch { /* ignore */ }
  }, [])

  async function handleVote(memberId: string, phone: string, vote: "yes" | "no") {
    setVoteLoading(true)
    try {
      await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: event.id, phone, vote }),
      })
      await refreshEvent()
    } catch { /* ignore */ }
    finally { setVoteLoading(false) }
  }

  async function sendPoke() {
    setPokeState("sending")
    try {
      const res = await fetch("/api/poke-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: event.id }),
      })
      if (!res.ok) { setPokeState("error"); return }
      setPokeState("sent")
    } catch { setPokeState("error") }
  }

  async function autoSchedule() {
    try {
      await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: event.id }),
      })
      await refreshEvent()
    } catch { /* ignore */ }
  }

  const pageUrl = typeof window !== "undefined"
    ? `${window.location.origin}/events/${event.id}`
    : ""

  return (
    <div className="space-y-6">
      <ItineraryExplorer itinerary={itinerary} />

      {/* Status banner */}
      {event.status === "confirmed" && event.scheduled_time && (
        <div className="flex items-center gap-3 rounded-2xl bg-[#ECFDF5] p-4">
          <CalendarCheck className="h-5 w-5 shrink-0 text-[#10B981]" />
          <div>
            <p className="text-sm font-bold text-[#10B981]">Confirmed</p>
            <p className="text-xs text-[#059669]">
              Scheduled for <strong>{formatTime(event.scheduled_time)}</strong>
            </p>
          </div>
        </div>
      )}

      {/* Vote Card */}
      <div className="card-shadow overflow-hidden rounded-2xl bg-white">
        {/* Progress bar */}
        <div className="h-1 bg-[#F5F5F5]">
          <div className="h-full rounded-r-full bg-[#FF6B00] transition-all" style={{ width: `${pct}%` }} />
        </div>

        <div className="flex items-center justify-between px-5 py-3">
          <div>
            <span className="text-sm font-bold text-black">Group vote</span>
            <p className="text-xs text-[#888]">{yesVotes} of {total} responded · need {quorum}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn(
              "inline-flex items-center gap-1 rounded-3xl px-2.5 py-1 text-[11px] font-semibold",
              event.status === "confirmed" ? "bg-[#ECFDF5] text-[#10B981]" : "bg-[#FFF2E8] text-[#FF6B00]"
            )}>
              {event.status === "confirmed" ? "Confirmed" : "Voting"}
            </span>
            <button onClick={refreshEvent} className="rounded-xl p-1.5 text-[#888] transition-colors hover:bg-[#F5F5F5]" aria-label="Refresh">
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="px-5">
          {event.group.members.map((member, mi) => {
            const vote = event.votes.find((v) => v.user_id === member.id)
            const initial = member.name[0]?.toUpperCase() ?? "?"
            const color = AVATAR_COLORS[mi % AVATAR_COLORS.length]
            return (
              <div key={member.id} className="flex items-center gap-3 border-t border-[rgba(0,0,0,0.04)] py-3">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: color }}
                >
                  {initial}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-black">{member.name}</p>
                  <p className="text-xs text-[#888]">{member.phone}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {vote ? (
                    vote.vote === "yes" ? (
                      <span className="flex items-center gap-1 text-xs font-semibold text-[#10B981]"><CheckCircle className="h-4 w-4" /> In</span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-semibold text-[#EF4444]"><XCircle className="h-4 w-4" /> Skip</span>
                    )
                  ) : event.status !== "confirmed" ? (
                    <div className="flex gap-1">
                      {(["yes", "no"] as const).map((v) => (
                        <button
                          key={v}
                          disabled={voteLoading}
                          onClick={() => handleVote(member.id, member.phone, v)}
                          className={cn(
                            "rounded-xl px-2.5 py-1 text-xs font-semibold transition-all hover:scale-105 active:scale-95 disabled:opacity-50",
                            v === "yes" ? "bg-[#ECFDF5] text-[#10B981]" : "bg-red-50 text-[#EF4444]"
                          )}
                        >
                          {v === "yes" ? "Yes" : "No"}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-[#888]">—</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {event.status === "quorum_reached" && (
          <div className="px-5 pb-4 pt-2">
            <button
              onClick={autoSchedule}
              className="w-full rounded-xl bg-[#FF6B00] px-4 py-2.5 text-sm font-semibold text-white transition-all hover:brightness-110"
            >
              Schedule event
            </button>
          </div>
        )}

        {/* Integrated POKE button */}
        {event.status !== "confirmed" && (
          <div className="border-t border-[rgba(0,0,0,0.04)] px-5 py-3">
            <button
              onClick={sendPoke}
              disabled={pokeState === "sending" || pokeState === "sent"}
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all",
                pokeState === "sent"
                  ? "bg-[#ECFDF5] text-[#10B981]"
                  : pokeState === "error"
                    ? "bg-red-50 text-[#EF4444] hover:bg-red-100"
                    : "bg-[#FF6B00] text-white hover:brightness-110 disabled:opacity-50"
              )}
            >
              {pokeState === "sending" && <Loader2 className="h-4 w-4 animate-spin" />}
              {pokeState === "sent" && <CheckCircle className="h-4 w-4" />}
              {pokeState === "idle" && <Send className="h-4 w-4" />}
              {pokeState === "error" && <AlertCircle className="h-4 w-4" />}
              {pokeState === "sending" ? "Sending via iMessage…" : pokeState === "sent" ? "Sent!" : pokeState === "error" ? "Retry sending" : "Send POKE iMessage to group"}
            </button>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          className="card-shadow inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-semibold text-black transition-colors hover:bg-[#F5F5F5]"
          onClick={() => copyText("link", pageUrl)}
        >
          <Link2 className="h-3.5 w-3.5" />
          {copied === "link" ? "Copied!" : "Copy link"}
        </button>
        <button
          className="card-shadow inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-semibold text-black transition-colors hover:bg-[#F5F5F5]"
          onClick={() => copyText("id", event.id)}
        >
          <Copy className="h-3.5 w-3.5" />
          {copied === "id" ? "Copied!" : "Copy event ID"}
        </button>
        {itinerary.venue_maps_url && (
          <a
            href={itinerary.venue_maps_url}
            target="_blank"
            rel="noopener noreferrer"
            className="card-shadow inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-semibold text-black transition-colors hover:bg-[#F5F5F5]"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Open in Maps
          </a>
        )}
      </div>
    </div>
  )
}
