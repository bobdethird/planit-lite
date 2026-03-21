"use client"

import Link from "next/link"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Loader2,
  Sparkles,
  MapPin,
  Clock,
  DollarSign,
  Calendar,
  CheckCircle2,
  XCircle,
  MessageSquare,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Zap,
  Users,
  ArrowRight,
  Star,
  ExternalLink,
  Download,
  Camera,
} from "lucide-react"
import type { VideoContext, Itinerary, Event as VibeEvent } from "@/lib/schemas"
import { cn } from "@/lib/utils"

// ─── Types ──────────────────────────────────────────────────────────────────

type AppStage =
  | "idle"
  | "downloading"
  | "transcribing"
  | "analyzing"
  | "planning"
  | "voting"
  | "quorum_reached"
  | "scheduling"
  | "confirmed"

// ─── Utility ────────────────────────────────────────────────────────────────

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function categoryConfig(cat: string) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    nightlife: { label: "Nightlife", color: "text-violet-700", bg: "bg-violet-50" },
    food:      { label: "Food & Drink", color: "text-orange-700", bg: "bg-orange-50" },
    outdoors:  { label: "Outdoors", color: "text-emerald-700", bg: "bg-emerald-50" },
    culture:   { label: "Culture", color: "text-blue-700", bg: "bg-blue-50" },
    sports:    { label: "Sports", color: "text-yellow-700", bg: "bg-yellow-50" },
    other:     { label: "Other", color: "text-gray-700", bg: "bg-gray-100" },
  }
  return map[cat] ?? map.other
}

const PIPELINE_STEPS: { stage: AppStage; label: string }[] = [
  { stage: "downloading", label: "Download" },
  { stage: "transcribing", label: "Transcribe" },
  { stage: "analyzing", label: "Analyze" },
  { stage: "planning", label: "Plan" },
  { stage: "voting", label: "Vote" },
  { stage: "confirmed", label: "Confirm" },
]

// ─── StatusBadge ────────────────────────────────────────────────────────────

function StatusBadge({ stage }: { stage: AppStage }) {
  const active = ["downloading", "transcribing", "analyzing", "planning", "scheduling"].includes(stage)
  const labels: Record<AppStage, string> = {
    idle: "Ready",
    downloading: "Downloading...",
    transcribing: "Transcribing...",
    analyzing: "Analyzing...",
    planning: "Planning...",
    voting: "Awaiting votes",
    quorum_reached: "Quorum reached",
    scheduling: "Scheduling...",
    confirmed: "Confirmed!",
  }
  if (stage === "idle") return null
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
        stage === "confirmed"
          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
          : stage === "quorum_reached"
            ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
            : active
              ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
              : "bg-gray-100 text-gray-600 ring-1 ring-gray-200"
      )}
    >
      {active && <Loader2 className="size-3 animate-spin" />}
      {stage === "confirmed" && <CheckCircle2 className="size-3" />}
      {labels[stage]}
    </div>
  )
}

// ─── VibeCard ───────────────────────────────────────────────────────────────

function VibeCard({ context }: { context: VideoContext }) {
  const cat = categoryConfig(context.activity_category)
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2.5">
        <div className="size-7 rounded-full bg-blue-50 flex items-center justify-center">
          <Sparkles className="size-3.5 text-blue-600" />
        </div>
        <span className="text-sm font-semibold font-heading text-gray-800">Vibe Analysis</span>
        <span className={cn("ml-auto text-xs font-medium px-2.5 py-0.5 rounded-full", cat.bg, cat.color)}>
          {cat.label}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-0 divide-x divide-y divide-gray-100">
        <div className="px-5 py-3.5">
          <p className="text-xs text-gray-400 mb-1">Venue type</p>
          <p className="text-sm font-medium text-gray-800">{context.venue_type}</p>
        </div>
        <div className="px-5 py-3.5">
          <p className="text-xs text-gray-400 mb-1">Vibe</p>
          <p className="text-sm font-medium text-gray-800">{context.vibe}</p>
        </div>
        <div className="px-5 py-3.5">
          <p className="text-xs text-gray-400 mb-1">Price range</p>
          <p className="text-sm font-medium text-gray-800">{context.price_range}</p>
        </div>
        <div className="px-5 py-3.5">
          <p className="text-xs text-gray-400 mb-1">Est. duration</p>
          <p className="text-sm font-medium text-gray-800">{context.duration_estimate_hrs}h</p>
        </div>
      </div>
      {context.location_hint && (
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center gap-1.5 text-xs text-gray-500">
          <MapPin className="size-3 text-blue-500" />
          {context.location_hint}
        </div>
      )}
    </div>
  )
}

// ─── ItineraryCard ───────────────────────────────────────────────────────────

function ItineraryCard({ itinerary }: { itinerary: Itinerary }) {
  const [showAgenda, setShowAgenda] = useState(false)
  const photo = itinerary.place_details?.photo_url
  const rating = itinerary.place_details?.rating
  const reviews = itinerary.place_details?.user_rating_count

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Photo banner */}
      {photo && (
        <div className="relative h-36 bg-gray-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo} alt={itinerary.venue_name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          <div className="absolute bottom-3 left-4 right-4">
            <p className="text-white text-base font-bold font-heading leading-tight drop-shadow">
              {itinerary.title}
            </p>
          </div>
        </div>
      )}

      <div className="px-5 py-4 border-b border-gray-100">
        {!photo && (
          <h2 className="font-heading text-lg font-bold text-gray-900 leading-tight mb-1">
            {itinerary.title}
          </h2>
        )}
        <p className="text-sm text-gray-500 leading-relaxed">{itinerary.description}</p>
      </div>

      {/* Venue details */}
      <div className="px-5 py-4 border-b border-gray-100 space-y-1.5">
        <div className="flex items-start gap-2">
          <MapPin className="size-4 text-blue-500 mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-800">{itinerary.venue_name}</p>
            <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{itinerary.venue_address}</p>
            <div className="flex items-center gap-3 mt-1.5">
              {rating && (
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <Star className="size-3 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium text-gray-700">{rating}</span>
                  {reviews && <span className="text-gray-400">({reviews.toLocaleString()})</span>}
                </span>
              )}
              <a
                href={itinerary.venue_maps_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                <ExternalLink className="size-3" />
                Open in Maps
              </a>
              {itinerary.place_details?.website && (
                <a
                  href={itinerary.place_details.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  Website
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 divide-x divide-gray-100">
        <div className="px-4 py-3 text-center">
          <DollarSign className="size-4 text-gray-400 mx-auto mb-1" />
          <p className="text-sm font-bold text-gray-800">{itinerary.cost_per_person}</p>
          <p className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5">per person</p>
        </div>
        <div className="px-4 py-3 text-center">
          <Clock className="size-4 text-gray-400 mx-auto mb-1" />
          <p className="text-sm font-bold text-gray-800">{itinerary.duration_hrs}h</p>
          <p className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5">duration</p>
        </div>
        <div className="px-4 py-3 text-center">
          <Calendar className="size-4 text-gray-400 mx-auto mb-1" />
          <p className="text-xs font-medium text-gray-700 leading-tight">
            {new Date(itinerary.suggested_date_range.start).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </p>
          <p className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5">earliest</p>
        </div>
      </div>

      {/* Agenda toggle */}
      {itinerary.agenda.length > 0 && (
        <div className="border-t border-gray-100">
          <button
            onClick={() => setShowAgenda(!showAgenda)}
            className="w-full flex items-center justify-between px-5 py-3 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <span className="font-medium">View agenda <span className="text-gray-400 font-normal">({itinerary.agenda.length} items)</span></span>
            {showAgenda ? <ChevronUp className="size-4 text-gray-400" /> : <ChevronDown className="size-4 text-gray-400" />}
          </button>
          {showAgenda && (
            <div className="px-5 pb-4 space-y-0">
              {itinerary.agenda.map((item, i) => (
                <div key={i} className="flex items-start gap-3 py-2.5 border-t border-gray-50 first:border-0">
                  <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
                    <div className="size-5 rounded-full bg-blue-50 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-blue-600">{i + 1}</span>
                    </div>
                    {i < itinerary.agenda.length - 1 && (
                      <div className="w-px h-3 bg-gray-200" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium text-blue-600">+{item.time_offset_min}m</span>
                    <p className="text-sm text-gray-700 mt-0.5 leading-relaxed">{item.activity}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── VoteTracker ─────────────────────────────────────────────────────────────

function VoteTracker({ event, onRefresh }: { event: VibeEvent; onRefresh: () => void }) {
  const yes = event.votes.filter((v) => v.vote === "yes").length
  const total = event.group.members.length
  const quorumNeeded = Math.ceil(total * event.quorum_threshold)
  const pct = Math.min(100, (yes / total) * 100)

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="size-7 rounded-full bg-pink-50 flex items-center justify-center">
            <MessageSquare className="size-3.5 text-pink-600" />
          </div>
          <div>
            <p className="text-sm font-semibold font-heading text-gray-800">POKE Vote</p>
            <p className="text-xs text-gray-400">{yes} of {total} voted · need {quorumNeeded}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-xs font-medium px-2.5 py-1 rounded-full",
              event.status === "confirmed"
                ? "bg-emerald-50 text-emerald-700"
                : event.status === "quorum_reached"
                  ? "bg-blue-50 text-blue-700"
                  : "bg-amber-50 text-amber-700"
            )}
          >
            {event.status.replace("_", " ")}
          </span>
          <button
            type="button"
            onClick={onRefresh}
            aria-label="Refresh"
            className="size-7 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
          >
            <RefreshCw className="size-3.5 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-5 pt-4 pb-2">
        <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-blue-500 transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Members */}
      <div className="px-5 pb-4 space-y-2 mt-1">
        {event.group.members.map((member) => {
          const memberVote = event.votes.find((v) => v.user_id === member.id)
          const initials = member.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
          return (
            <div key={member.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-xs font-bold text-white">
                  {initials}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">{member.name}</p>
                  <p className="text-xs text-gray-400">{member.phone}</p>
                </div>
              </div>
              {memberVote ? (
                memberVote.vote === "yes" ? (
                  <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                    <CheckCircle2 className="size-3" /> In
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2.5 py-1 rounded-full">
                    <XCircle className="size-3" /> Skip
                  </span>
                )
              ) : (
                <span className="text-xs text-gray-400">Waiting...</span>
              )}
            </div>
          )
        })}
      </div>

      {event.status === "quorum_reached" && (
        <div className="mx-5 mb-4 rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 flex items-center gap-2.5">
          <Zap className="size-4 text-blue-500 shrink-0" />
          <p className="text-sm text-blue-700">Quorum reached! Finding the best time for everyone...</p>
        </div>
      )}

      {event.status === "confirmed" && event.scheduled_time && (
        <div className="mx-5 mb-4 rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3 flex items-center gap-2.5">
          <Calendar className="size-4 text-emerald-600 shrink-0" />
          <p className="text-sm text-emerald-700">
            Scheduled for <span className="font-semibold">{formatTime(event.scheduled_time)}</span>
          </p>
        </div>
      )}
    </div>
  )
}

// ─── DemoVotePanel ────────────────────────────────────────────────────────────

function DemoVotePanel({
  event,
  onVote,
}: {
  event: VibeEvent
  onVote: (phone: string, vote: "yes" | "no") => void
}) {
  return (
    <div className="bg-gray-50 rounded-2xl border border-dashed border-gray-300 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Demo — simulate friend votes</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {event.group.members.map((member) => {
          const voted = event.votes.find((v) => v.user_id === member.id)
          return (
            <div
              key={member.id}
              className={cn(
                "flex items-center justify-between rounded-xl border px-3 py-2.5 transition-colors",
                voted?.vote === "yes" ? "border-emerald-200 bg-emerald-50" :
                voted?.vote === "no" ? "border-red-200 bg-red-50" :
                "border-gray-200 bg-white"
              )}
            >
              <span className="text-sm font-medium text-gray-700">{member.name}</span>
              <div className="flex gap-1">
                <button
                  onClick={() => onVote(member.phone, "yes")}
                  className={cn(
                    "text-sm px-2 py-0.5 rounded-lg transition-colors",
                    voted?.vote === "yes" ? "bg-emerald-100" : "hover:bg-gray-100"
                  )}
                >👍</button>
                <button
                  onClick={() => onVote(member.phone, "no")}
                  className={cn(
                    "text-sm px-2 py-0.5 rounded-lg transition-colors",
                    voted?.vote === "no" ? "bg-red-100" : "hover:bg-gray-100"
                  )}
                >👎</button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Pipeline Steps ────────────────────────────────────────────────────────

function PipelineProgress({ stage }: { stage: AppStage }) {
  const order: AppStage[] = ["downloading", "transcribing", "analyzing", "planning", "voting", "confirmed"]
  const cur = order.indexOf(stage)

  const subtext: Partial<Record<AppStage, string>> = {
    downloading: "yt-dlp → mp4",
    transcribing: "ElevenLabs Scribe v2",
    analyzing: "Gemini 2.5 Flash vision",
    planning: "Gemini + Google Maps Places",
    voting: "POKE iMessage agent",
    scheduling: "Google Calendar",
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-center gap-3 mb-5">
        <Loader2 className="size-5 text-blue-600 animate-spin" />
        <div>
          <p className="text-sm font-semibold font-heading text-gray-800">
            {stage === "downloading" && "Downloading your reel..."}
            {stage === "transcribing" && "Transcribing the audio..."}
            {stage === "analyzing" && "Gemini is watching the video..."}
            {stage === "planning" && "Building your itinerary..."}
            {stage === "scheduling" && "Finding the best time..."}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">{subtext[stage]}</p>
        </div>
      </div>

      {/* Step pills */}
      <div className="flex items-center gap-1.5">
        {PIPELINE_STEPS.map(({ stage: s, label }, i) => {
          const idx = order.indexOf(s)
          const isCompleted = idx < cur
          const isActive = idx === cur
          return (
            <div key={s} className="flex items-center gap-1.5 flex-1">
              <div className={cn(
                "flex-1 flex items-center justify-center rounded-full py-1 text-[10px] font-semibold transition-all",
                isCompleted ? "bg-blue-500 text-white" :
                isActive ? "bg-blue-100 text-blue-700 ring-1 ring-blue-300" :
                "bg-gray-100 text-gray-400"
              )}>
                {isCompleted ? "✓" : label}
              </div>
              {i < PIPELINE_STEPS.length - 1 && (
                <div className={cn("h-px flex-shrink-0 w-2", isCompleted ? "bg-blue-300" : "bg-gray-200")} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function Page() {
  const [url, setUrl] = useState("")
  const [stage, setStage] = useState<AppStage>("idle")
  const [error, setError] = useState<string | null>(null)
  const [videoContext, setVideoContext] = useState<VideoContext | null>(null)
  const [itinerary, setItinerary] = useState<Itinerary | null>(null)
  const [event, setEvent] = useState<VibeEvent | null>(null)
  const [origin, setOrigin] = useState("")
  const [mcpCopied, setMcpCopied] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  useEffect(() => {
    if (!event || !["voting", "quorum_reached"].includes(event.status)) {
      if (pollRef.current) clearInterval(pollRef.current)
      return
    }
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/events/${event.id}`)
        const data = await res.json()
        if (data.event) {
          setEvent(data.event)
          if (data.event.status === "confirmed") {
            setStage("confirmed")
            clearInterval(pollRef.current!)
          }
        }
      } catch { /* ignore poll errors */ }
    }, 3000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event?.id, event?.status])

  async function triggerSchedule(eventId: string) {
    await fetch("/api/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_id: eventId }),
    })
  }

  async function handleAnalyze() {
    const trimmed = url.trim()
    if (!trimmed) return
    setError(null)
    setVideoContext(null)
    setItinerary(null)
    setEvent(null)

    setStage("downloading")
    let filename: string
    try {
      const res = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Download failed"); setStage("idle"); return }
      filename = data.filename
    } catch {
      setError("Download failed. Check your URL and try again.")
      setStage("idle")
      return
    }

    setStage("transcribing")
    try {
      await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename }),
      })
    } catch { /* continue */ }

    setStage("analyzing")
    let vc: VideoContext
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Gemini analysis failed"); setStage("idle"); return }
      vc = data.videoContext
      setVideoContext(vc)
    } catch {
      setError("Gemini analysis failed")
      setStage("idle")
      return
    }

    setStage("planning")
    let plan: Itinerary
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoContext: vc }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Planning failed"); setStage("idle"); return }
      plan = data.itinerary
      setItinerary(plan)
    } catch {
      setError("Planning failed")
      setStage("idle")
      return
    }

    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itinerary: plan }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Failed to create event"); setStage("idle"); return }
      setEvent(data.event)
      setStage("voting")
      setUrl("")
    } catch {
      setError("Failed to create event")
      setStage("idle")
    }
  }

  async function handleDemoVote(phone: string, vote: "yes" | "no") {
    if (!event) return
    try {
      await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: event.id, phone, vote }),
      })
      const res = await fetch(`/api/events/${event.id}`)
      const data = await res.json()
      if (data.event) {
        setEvent(data.event)
        if (data.event.status === "quorum_reached") {
          setStage("scheduling")
          await triggerSchedule(data.event.id)
          const res2 = await fetch(`/api/events/${event.id}`)
          const data2 = await res2.json()
          if (data2.event) {
            setEvent(data2.event)
            if (data2.event.status === "confirmed") setStage("confirmed")
          }
        }
      }
    } catch { /* ignore */ }
  }

  async function refreshEvent() {
    if (!event) return
    try {
      const res = await fetch(`/api/events/${event.id}`)
      const data = await res.json()
      if (data.event) setEvent(data.event)
    } catch { /* ignore */ }
  }

  const isProcessing = ["downloading", "transcribing", "analyzing", "planning", "scheduling"].includes(stage)

  return (
    <div className="min-h-svh bg-[#f8f9fa]">
      {/* Header */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-gray-200 bg-white/95 backdrop-blur px-6 shadow-[0_1px_0_0_rgba(0,0,0,0.06)]">
        <div className="flex items-center gap-2">
          <div className="size-7 rounded-lg bg-blue-600 flex items-center justify-center">
            <Zap className="size-4 text-white" />
          </div>
          <span className="font-heading text-base font-bold text-gray-900">VibeSync</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/events"
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors font-medium"
          >
            Events
          </Link>
          <StatusBadge stage={stage} />
          <span className="hidden text-xs text-gray-400 sm:flex items-center gap-1.5">
            <span className="inline-block size-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Zero to Agent Hackathon
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 py-10 space-y-6">

        {/* Hero */}
        <div className="text-center space-y-3 pt-2">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full border border-blue-100">
            <Camera className="size-3" />
            TikTok + Instagram → Real Plans
          </div>
          <h1 className="font-heading text-3xl font-extrabold text-gray-900 leading-tight tracking-tight">
            Drop a reel.{" "}
            <span className="text-blue-600">We&apos;ll plan the night.</span>
          </h1>
          <p className="text-sm text-gray-500 leading-relaxed max-w-sm mx-auto">
            Gemini reads the vibe, Google Maps finds the real venue, POKE texts your group on iMessage, and everyone&apos;s calendar gets booked.
          </p>
        </div>

        {/* URL Input */}
        {(stage === "idle" || stage === "confirmed") && (
          <form
            onSubmit={(e) => { e.preventDefault(); handleAnalyze() }}
            className="flex gap-2 bg-white rounded-2xl border border-gray-200 shadow-sm p-2"
          >
            <Input
              value={url}
              onChange={(e) => { setUrl(e.target.value); setError(null) }}
              placeholder="Paste a TikTok or Instagram reel link..."
              className="flex-1 h-9 border-0 shadow-none bg-transparent text-gray-800 placeholder:text-gray-400 focus-visible:ring-0 text-sm"
            />
            <Button
              type="submit"
              disabled={!url.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white font-heading h-9 px-4 shrink-0 rounded-xl text-sm font-semibold gap-1.5"
            >
              <ArrowRight className="size-4" />
              Go
            </Button>
          </form>
        )}

        {/* Processing state */}
        {isProcessing && <PipelineProgress stage={stage} />}

        {/* Error */}
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
            <XCircle className="size-4 mt-0.5 shrink-0 text-red-500" />
            {error}
          </div>
        )}

        {/* Vibe analysis */}
        {videoContext && <VibeCard context={videoContext} />}

        {/* Itinerary */}
        {itinerary && <ItineraryCard itinerary={itinerary} />}

        {/* Vote + demo panel */}
        {event && stage !== "idle" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-gray-400 font-mono">
                event · <span className="text-gray-500">{event.id.slice(0, 8)}...</span>
              </p>
              <Link
                href={`/events/${event.id}`}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
              >
                Open event page <ArrowRight className="size-3" />
              </Link>
            </div>

            <VoteTracker event={event} onRefresh={refreshEvent} />

            {(stage === "voting" || stage === "quorum_reached") && (
              <DemoVotePanel event={event} onVote={handleDemoVote} />
            )}

            {stage === "confirmed" && event.scheduled_time && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 text-center space-y-3">
                <div className="size-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="size-7 text-emerald-500" />
                </div>
                <div>
                  <h3 className="font-heading text-lg font-bold text-gray-900">You&apos;re all set!</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    <span className="font-medium text-gray-800">{event.itinerary.title}</span> is locked in for{" "}
                    <span className="font-medium text-gray-800">{formatTime(event.scheduled_time)}</span>.
                    Everyone&apos;s calendar has been updated.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setStage("idle"); setVideoContext(null); setItinerary(null); setEvent(null) }}
                  className="rounded-xl border-gray-200 text-gray-600 hover:text-gray-900 text-sm"
                >
                  Plan another event
                </Button>
              </div>
            )}

            {/* POKE MCP info */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="size-3.5 text-pink-500" />
                <span className="text-xs font-semibold text-gray-700">POKE MCP Server</span>
                <span className="ml-auto text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium">Live</span>
              </div>
              <p className="text-xs text-gray-400 font-mono">
                POST /api/mcp · event {event.id.slice(0, 8)}...
              </p>
              {origin ? (
                <div className="flex items-center gap-2">
                  <code className="flex-1 min-w-0 rounded-lg bg-gray-50 border border-gray-200 px-2.5 py-1.5 text-[10px] text-gray-500 font-mono truncate">
                    {origin}/api/mcp
                  </code>
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard.writeText(`${origin}/api/mcp`)
                      setMcpCopied(true)
                      setTimeout(() => setMcpCopied(false), 2000)
                    }}
                    className="text-xs font-medium text-blue-600 hover:text-blue-700 whitespace-nowrap"
                  >
                    {mcpCopied ? "Copied!" : "Copy"}
                  </button>
                </div>
              ) : null}
              <div className="flex flex-wrap gap-1.5">
                {["get_group_contacts", "get_itinerary", "get_member_availability", "record_vote", "confirm_event"].map((tool) => (
                  <span key={tool} className="text-[10px] font-mono px-2 py-1 rounded-lg bg-gray-50 text-gray-500 border border-gray-200">
                    {tool}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* How it works */}
        {stage === "idle" && !event && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider text-center">How it works</p>
            <div className="grid grid-cols-1 gap-2">
              {[
                { icon: Download,      label: "Download",       desc: "yt-dlp grabs the MP4 from TikTok or Instagram", color: "bg-blue-50 text-blue-600" },
                { icon: Sparkles,      label: "Analyze",        desc: "Gemini 2.5 Flash watches the video — venue type, vibe, price signals", color: "bg-purple-50 text-purple-600" },
                { icon: MapPin,        label: "Plan",           desc: "AI builds a real itinerary using Google Maps venue hours & ratings", color: "bg-emerald-50 text-emerald-600" },
                { icon: MessageSquare, label: "Vote via POKE",  desc: "POKE texts your iMessage group — friends reply 👍 or 👎", color: "bg-pink-50 text-pink-600" },
                { icon: Users,         label: "Schedule",       desc: "Quorum hit? Scheduling agent books everyone's Google Calendar", color: "bg-amber-50 text-amber-600" },
              ].map(({ icon: Icon, label, desc, color }) => (
                <div key={label} className="flex items-start gap-3 bg-white rounded-xl border border-gray-200 p-3.5">
                  <div className={cn("size-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5", color)}>
                    <Icon className="size-3.5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold font-heading text-gray-800">{label}</p>
                    <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
