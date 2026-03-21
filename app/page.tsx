"use client"

import Link from "next/link"
import { useState, useEffect, useRef } from "react"
import type { VideoContext, Itinerary, Event as VibeEvent } from "@/lib/schemas"
import { ItineraryExplorer } from "@/components/ItineraryExplorer"

// ─── Types ────────────────────────────────────────────────────────────────────

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

const PIPELINE: { stage: AppStage; label: string; icon: string; sub: string }[] = [
  { stage: "downloading",  label: "Download",   icon: "download",    sub: "yt-dlp → mp4" },
  { stage: "transcribing", label: "Transcribe", icon: "mic",         sub: "ElevenLabs Scribe v2" },
  { stage: "analyzing",    label: "Analyze",    icon: "smart_toy",   sub: "Gemini 2.5 Flash" },
  { stage: "planning",     label: "Plan",       icon: "map",         sub: "Gemini + Google Maps" },
  { stage: "voting",       label: "Vote",       icon: "how_to_vote", sub: "POKE iMessage" },
  { stage: "confirmed",    label: "Confirm",    icon: "event_available", sub: "Google Calendar" },
]

const PIPELINE_ORDER: AppStage[] = ["downloading","transcribing","analyzing","planning","voting","confirmed"]

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit",
  })
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function VibeChips({ context }: { context: VideoContext }) {
  const catIcon: Record<string, string> = {
    nightlife: "nightlife", food: "restaurant", outdoors: "park",
    culture: "museum", sports: "sports_soccer", other: "explore",
  }
  const priceIcon: Record<string, string> = {
    free: "money_off", "$": "attach_money", "$$": "payments", "$$$": "diamond",
  }
  return (
    <div
      className="md-card md-card-filled"
      style={{ padding: 20 }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div style={{
          width: 40, height: 40, borderRadius: "var(--md-shape-full)",
          background: "var(--md-primary-container)", color: "var(--md-on-primary-container)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span className="material-symbols-rounded" style={{ fontSize: 20 }}>auto_awesome</span>
        </div>
        <div>
          <p className="md-title-md" style={{ color: "var(--md-on-surface)" }}>Vibe Analysis</p>
          <p className="md-body-sm" style={{ color: "var(--md-on-surface-variant)" }}>Extracted by Gemini 2.5 Flash</p>
        </div>
      </div>

      {/* Chips */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <div className="md-chip md-chip--selected md-state">
          <span className="material-symbols-rounded" style={{ fontSize: 16 }}>{catIcon[context.activity_category] ?? "explore"}</span>
          {context.activity_category}
        </div>
        <div className="md-chip md-chip--selected md-state">
          <span className="material-symbols-rounded" style={{ fontSize: 16 }}>{priceIcon[context.price_range] ?? "attach_money"}</span>
          {context.price_range}
        </div>
        <div className="md-chip md-state">
          <span className="material-symbols-rounded" style={{ fontSize: 16 }}>schedule</span>
          ~{context.duration_estimate_hrs}h
        </div>
        {context.location_hint && (
          <div className="md-chip md-state">
            <span className="material-symbols-rounded" style={{ fontSize: 16 }}>location_on</span>
            {context.location_hint}
          </div>
        )}
      </div>

      {/* Vibe + venue type */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 16 }}>
        {[
          { label: "Venue type", value: context.venue_type },
          { label: "Vibe", value: context.vibe },
        ].map(({ label, value }) => (
          <div key={label} style={{
            background: "var(--md-container-low)",
            borderRadius: "var(--md-shape-sm)",
            padding: "12px 14px",
          }}>
            <p className="md-label-md" style={{ color: "var(--md-on-surface-variant)", marginBottom: 4 }}>{label}</p>
            <p className="md-body-md" style={{ color: "var(--md-on-surface)", fontWeight: 500 }}>{value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function PipelineCard({ stage }: { stage: AppStage }) {
  const curIdx = PIPELINE_ORDER.indexOf(stage)
  const step = PIPELINE.find(p => p.stage === stage)

  return (
    <div className="md-card md-card-elevated" style={{ padding: "20px 20px 16px" }}>
      {/* Current step header */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
        <div style={{
          width: 48, height: 48, borderRadius: "var(--md-shape-full)",
          background: "var(--md-primary-container)", color: "var(--md-on-primary-container)",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
          animation: "spin 1.5s linear infinite",
        }}>
          <span className="material-symbols-rounded" style={{ fontSize: 24 }}>{step?.icon ?? "sync"}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="md-title-md" style={{ color: "var(--md-on-surface)" }}>
            {stage === "downloading"  && "Downloading your reel…"}
            {stage === "transcribing" && "Transcribing audio…"}
            {stage === "analyzing"    && "Gemini is watching the video…"}
            {stage === "planning"     && "Building your itinerary…"}
            {stage === "scheduling"   && "Finding the best time…"}
          </p>
          <p className="md-body-sm" style={{ color: "var(--md-on-surface-variant)", marginTop: 2 }}>{step?.sub}</p>
        </div>
      </div>

      {/* M3 Linear Progress */}
      <div className="md-linear-progress" style={{ marginBottom: 12 }}>
        <div className="md-linear-progress__track md-linear-progress--indeterminate" style={{ width: "35%" }} />
      </div>

      {/* Step indicators */}
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        {PIPELINE.map(({ stage: s, label }, i) => {
          const idx = PIPELINE_ORDER.indexOf(s)
          const done = idx < curIdx
          const active = idx === curIdx
          return (
            <div key={s} style={{ display: "flex", alignItems: "center", gap: 4, flex: 1 }}>
              <div style={{
                flex: 1,
                height: 24,
                borderRadius: "var(--md-shape-full)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: done
                  ? "var(--md-primary)"
                  : active
                  ? "var(--md-primary-container)"
                  : "var(--md-container)",
                transition: `background var(--md-dur-medium) var(--md-easing-standard)`,
              }}>
                {done
                  ? <span className="material-symbols-rounded" style={{ fontSize: 14, color: "var(--md-on-primary)" }}>check</span>
                  : <span className="md-label-sm" style={{ color: active ? "var(--md-on-primary-container)" : "var(--md-on-surface-variant)" }}>{label}</span>
                }
              </div>
              {i < PIPELINE.length - 1 && (
                <div style={{ width: 4, height: 1, background: done ? "var(--md-primary)" : "var(--md-outline-variant)", flexShrink: 0 }} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function VoteCard({ event, onRefresh }: { event: VibeEvent; onRefresh: () => void }) {
  const yes = event.votes.filter(v => v.vote === "yes").length
  const total = event.group.members.length
  const pct = Math.min(100, (yes / total) * 100)
  const quorum = Math.ceil(total * event.quorum_threshold)

  const statusColor = event.status === "confirmed"
    ? "var(--md-tertiary)"
    : event.status === "quorum_reached"
    ? "var(--md-primary)"
    : "var(--md-secondary)"

  return (
    <div className="md-card md-card-outlined">
      {/* Header */}
      <div style={{
        padding: "16px 16px 12px",
        display: "flex", alignItems: "center", gap: 12,
        borderBottom: "1px solid var(--md-outline-variant)",
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: "var(--md-shape-full)",
          background: "var(--md-tertiary-container)", color: "var(--md-on-tertiary-container)",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <span className="material-symbols-rounded" style={{ fontSize: 20 }}>how_to_vote</span>
        </div>
        <div style={{ flex: 1 }}>
          <p className="md-title-md" style={{ color: "var(--md-on-surface)" }}>Group Vote</p>
          <p className="md-body-sm" style={{ color: "var(--md-on-surface-variant)" }}>
            {yes} of {total} responded · need {quorum} for quorum
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div className="md-chip md-chip--assist" style={{
            height: 28,
            background: `color-mix(in oklch, ${statusColor} 12%, transparent)`,
            color: statusColor,
            border: "none",
            padding: "0 12px",
          }}>
            <span className="md-label-md">{event.status.replace("_", " ")}</span>
          </div>
          <button
            onClick={onRefresh}
            className="md-icon-btn md-state"
            style={{ width: 40, height: 40 }}
            aria-label="Refresh"
          >
            <span className="material-symbols-rounded" style={{ fontSize: 20 }}>refresh</span>
          </button>
        </div>
      </div>

      {/* Progress */}
      <div style={{ padding: "12px 16px 0" }}>
        <div className="md-linear-progress">
          <div className="md-linear-progress__track" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Members list */}
      <div>
        {event.group.members.map((member, i) => {
          const vote = event.votes.find(v => v.user_id === member.id)
          const initials = member.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
          return (
            <div key={member.id}>
              {i > 0 && <div className="md-divider" style={{ marginLeft: 72 }} />}
              <div className="md-list-item">
                <div className="md-list-item__leading md-list-item__leading--primary-container">
                  {initials}
                </div>
                <div className="md-list-item__content">
                  <p className="md-list-item__headline">{member.name}</p>
                  <p className="md-list-item__supporting">{member.phone}</p>
                </div>
                <div className="md-list-item__trailing">
                  {vote ? (
                    vote.vote === "yes" ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--md-tertiary)" }}>
                        <span className="material-symbols-rounded" style={{ fontSize: 18 }}>check_circle</span>
                        <span className="md-label-md">In</span>
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--md-error)" }}>
                        <span className="material-symbols-rounded" style={{ fontSize: 18 }}>cancel</span>
                        <span className="md-label-md">Skip</span>
                      </div>
                    )
                  ) : (
                    <span className="md-label-md" style={{ color: "var(--md-on-surface-variant)" }}>Waiting…</span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Banners */}
      {event.status === "quorum_reached" && (
        <div style={{
          margin: "0 16px 16px",
          padding: "12px 16px",
          borderRadius: "var(--md-shape-sm)",
          background: "var(--md-primary-container)",
          color: "var(--md-on-primary-container)",
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <span className="material-symbols-rounded" style={{ fontSize: 20 }}>bolt</span>
          <p className="md-body-md">Quorum reached! Finding the best time for everyone…</p>
        </div>
      )}
      {event.status === "confirmed" && event.scheduled_time && (
        <div style={{
          margin: "0 16px 16px",
          padding: "12px 16px",
          borderRadius: "var(--md-shape-sm)",
          background: "var(--md-tertiary-container)",
          color: "var(--md-on-tertiary-container)",
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <span className="material-symbols-rounded" style={{ fontSize: 20 }}>event_available</span>
          <p className="md-body-md">
            Scheduled for <strong>{formatTime(event.scheduled_time)}</strong>
          </p>
        </div>
      )}
    </div>
  )
}

function DemoVotePanel({ event, onVote }: { event: VibeEvent; onVote: (phone: string, vote: "yes" | "no") => void }) {
  return (
    <div className="md-card md-card-outlined" style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span className="material-symbols-rounded" style={{ fontSize: 18, color: "var(--md-on-surface-variant)" }}>science</span>
        <p className="md-label-lg" style={{ color: "var(--md-on-surface-variant)" }}>Demo — simulate friend votes</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {event.group.members.map(member => {
          const voted = event.votes.find(v => v.user_id === member.id)
          return (
            <div key={member.id} style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 12px",
              borderRadius: "var(--md-shape-sm)",
              background: voted?.vote === "yes"
                ? "var(--md-tertiary-container)"
                : voted?.vote === "no"
                ? "var(--md-error-container)"
                : "var(--md-container)",
              transition: `background var(--md-dur-short) var(--md-easing-standard)`,
            }}>
              <span className="md-label-lg" style={{
                color: voted?.vote === "yes"
                  ? "var(--md-on-tertiary-container)"
                  : voted?.vote === "no"
                  ? "var(--md-on-error-container)"
                  : "var(--md-on-surface)",
              }}>{member.name}</span>
              <div style={{ display: "flex", gap: 2 }}>
                {(["yes", "no"] as const).map(v => (
                  <button
                    key={v}
                    onClick={() => onVote(member.phone, v)}
                    className="md-state"
                    style={{
                      padding: "4px 8px",
                      borderRadius: "var(--md-shape-xs)",
                      border: "none",
                      background: voted?.vote === v
                        ? v === "yes" ? "var(--md-tertiary)" : "var(--md-error)"
                        : "transparent",
                      cursor: "pointer",
                      fontSize: 16,
                    }}
                  >
                    {v === "yes" ? "👍" : "👎"}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function McpCard({ event, origin }: { event: VibeEvent; origin: string }) {
  const [copied, setCopied] = useState(false)
  const url = `${origin}/api/mcp`
  const tools = ["get_group_contacts","get_itinerary","get_member_availability","record_vote","confirm_event"]

  return (
    <div className="md-card md-card-filled" style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <span className="material-symbols-rounded" style={{ fontSize: 20, color: "var(--md-primary)" }}>api</span>
        <p className="md-title-sm" style={{ color: "var(--md-on-surface)", flex: 1 }}>POKE MCP Server</p>
        <div className="md-chip md-chip--selected md-chip--assist" style={{ height: 26, padding: "0 10px" }}>
          <span className="material-symbols-rounded" style={{ fontSize: 14 }}>fiber_manual_record</span>
          <span className="md-label-sm">Live</span>
        </div>
      </div>

      <p className="md-body-sm" style={{ color: "var(--md-on-surface-variant)", marginBottom: 10, fontFamily: "monospace" }}>
        POST /api/mcp · event {event.id.slice(0, 8)}…
      </p>

      {origin && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <div style={{
            flex: 1, minWidth: 0,
            padding: "8px 12px",
            borderRadius: "var(--md-shape-xs)",
            background: "var(--md-container-low)",
            fontFamily: "monospace",
            fontSize: 12,
            color: "var(--md-on-surface-variant)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}>
            {url}
          </div>
          <button
            className="md-btn md-btn-text md-state"
            onClick={() => { void navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
          >
            <span className="material-symbols-rounded" style={{ fontSize: 18 }}>{copied ? "check" : "content_copy"}</span>
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {tools.map(t => (
          <div key={t} className="md-chip md-chip--assist md-state" style={{ height: 28, padding: "0 10px", borderRadius: "var(--md-shape-xs)", fontFamily: "monospace", fontSize: 11 }}>
            {t}()
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function Page() {
  const [url, setUrl] = useState("")
  const [stage, setStage] = useState<AppStage>("idle")
  const [error, setError] = useState<string | null>(null)
  const [videoContext, setVideoContext] = useState<VideoContext | null>(null)
  const [itinerary, setItinerary] = useState<Itinerary | null>(null)
  const [event, setEvent] = useState<VibeEvent | null>(null)
  const [origin, setOrigin] = useState("")
  const [scrolled, setScrolled] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => { setOrigin(window.location.origin) }, [])
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4)
    window.addEventListener("scroll", onScroll)
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  // Poll event during voting
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
          if (data.event.status === "confirmed") { setStage("confirmed"); clearInterval(pollRef.current!) }
        }
      } catch { /* ignore */ }
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
    setError(null); setVideoContext(null); setItinerary(null); setEvent(null)

    setStage("downloading")
    let filename: string
    try {
      const res = await fetch("/api/download", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: trimmed }) })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Download failed"); setStage("idle"); return }
      filename = data.filename
    } catch { setError("Download failed. Check your URL and try again."); setStage("idle"); return }

    setStage("transcribing")
    try { await fetch("/api/transcribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ filename }) }) }
    catch { /* non-fatal */ }

    setStage("analyzing")
    let vc: VideoContext
    try {
      const res = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ filename }) })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Analysis failed"); setStage("idle"); return }
      vc = data.videoContext; setVideoContext(vc)
    } catch { setError("Gemini analysis failed"); setStage("idle"); return }

    setStage("planning")
    let plan: Itinerary
    try {
      const res = await fetch("/api/plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ videoContext: vc }) })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Planning failed"); setStage("idle"); return }
      plan = data.itinerary; setItinerary(plan)
    } catch { setError("Planning failed"); setStage("idle"); return }

    try {
      const res = await fetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ itinerary: plan }) })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Failed to create event"); setStage("idle"); return }
      setEvent(data.event); setStage("voting"); setUrl("")
    } catch { setError("Failed to create event"); setStage("idle") }
  }

  async function handleDemoVote(phone: string, vote: "yes" | "no") {
    if (!event) return
    try {
      await fetch("/api/vote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event_id: event.id, phone, vote }) })
      const res = await fetch(`/api/events/${event.id}`)
      const data = await res.json()
      if (data.event) {
        setEvent(data.event)
        if (data.event.status === "quorum_reached") {
          setStage("scheduling")
          await triggerSchedule(data.event.id)
          const res2 = await fetch(`/api/events/${event.id}`)
          const data2 = await res2.json()
          if (data2.event) { setEvent(data2.event); if (data2.event.status === "confirmed") setStage("confirmed") }
        }
      }
    } catch { /* ignore */ }
  }

  const isProcessing = ["downloading","transcribing","analyzing","planning","scheduling"].includes(stage)
  const showInput = stage === "idle" || stage === "confirmed"

  return (
    <div style={{ minHeight: "100svh", background: "var(--md-background)" }}>

      {/* ── Top App Bar ─────────────────────────────────────────────────── */}
      <header className={`md-top-app-bar${scrolled ? " md-top-app-bar--scrolled" : ""}`}>
        <div style={{ width: 8 }} />
        <p className="md-top-app-bar__title">VibeSync</p>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {stage !== "idle" && (
            <div className="md-chip md-chip--assist" style={{
              height: 28,
              padding: "0 12px",
              background: stage === "confirmed"
                ? "var(--md-tertiary-container)"
                : isProcessing
                ? "var(--md-primary-container)"
                : "var(--md-secondary-container)",
              color: stage === "confirmed"
                ? "var(--md-on-tertiary-container)"
                : isProcessing
                ? "var(--md-on-primary-container)"
                : "var(--md-on-secondary-container)",
              border: "none",
            }}>
              {isProcessing && <span className="material-symbols-rounded" style={{ fontSize: 14, animation: "spin 1.5s linear infinite" }}>sync</span>}
              {stage === "confirmed" && <span className="material-symbols-rounded" style={{ fontSize: 14 }}>check_circle</span>}
              <span className="md-label-md">
                {stage === "confirmed" ? "Confirmed!" : stage === "voting" ? "Voting open" : stage.charAt(0).toUpperCase() + stage.slice(1) + "…"}
              </span>
            </div>
          )}
          <button className="md-icon-btn md-state" aria-label="Hackathon badge">
            <span className="material-symbols-rounded" style={{ fontSize: 20, color: "var(--md-primary)" }}>workspace_premium</span>
          </button>
        </div>
      </header>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <main style={{ maxWidth: 680, margin: "0 auto", padding: "24px 16px 40px" }}>

        {/* Hero */}
        <div style={{ marginBottom: 28 }}>
          <p className="md-label-lg" style={{
            color: "var(--md-primary)",
            marginBottom: 8,
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <span className="material-symbols-rounded" style={{ fontSize: 16 }}>bolt</span>
            Zero to Agent Hackathon SF · Mar 21, 2026
          </p>
          <h1 className="md-headline-md" style={{ color: "var(--md-on-surface)", marginBottom: 10 }}>
            Drop a reel. We&apos;ll plan the night.
          </h1>
          <p className="md-body-lg" style={{ color: "var(--md-on-surface-variant)", maxWidth: 520 }}>
            Gemini reads the vibe, Google Maps finds the venue, POKE texts your group on iMessage, and everyone&apos;s calendar gets booked.
          </p>
        </div>

        {/* Search bar */}
        {showInput && (
          <form
            onSubmit={e => { e.preventDefault(); handleAnalyze() }}
            style={{ marginBottom: 24 }}
          >
            <div className="md-search-bar">
              <span className="material-symbols-rounded" style={{ fontSize: 22, color: "var(--md-on-surface-variant)", flexShrink: 0 }}>link</span>
              <input
                className="md-search-bar__input"
                value={url}
                onChange={e => { setUrl(e.target.value); setError(null) }}
                placeholder="Paste a TikTok or Instagram reel link…"
              />
              <button
                type="submit"
                disabled={!url.trim()}
                className="md-btn md-btn-filled md-state"
                style={{ flexShrink: 0, height: 40, padding: "0 20px" }}
              >
                <span className="material-symbols-rounded" style={{ fontSize: 18 }}>send</span>
                Go
              </button>
            </div>
          </form>
        )}

        {/* Pipeline progress */}
        {isProcessing && <div style={{ marginBottom: 20 }}><PipelineCard stage={stage} /></div>}

        {/* Error */}
        {error && (
          <div style={{
            display: "flex", alignItems: "flex-start", gap: 12,
            padding: "14px 16px",
            borderRadius: "var(--md-shape-sm)",
            background: "var(--md-error-container)",
            color: "var(--md-on-error-container)",
            marginBottom: 20,
          }}>
            <span className="material-symbols-rounded" style={{ fontSize: 20, flexShrink: 0, marginTop: 1 }}>error</span>
            <p className="md-body-md">{error}</p>
          </div>
        )}

        {/* Vibe analysis */}
        {videoContext && <div style={{ marginBottom: 20 }}><VibeChips context={videoContext} /></div>}

        {/* Itinerary */}
        {itinerary && <div style={{ marginBottom: 20 }}><ItineraryExplorer itinerary={itinerary} /></div>}

        {/* Event / voting section */}
        {event && stage !== "idle" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Event meta */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <p className="md-body-sm" style={{ color: "var(--md-on-surface-variant)", fontFamily: "monospace" }}>
                event · {event.id.slice(0, 8)}…
              </p>
              <Link href={`/events/${event.id}`} className="md-btn md-btn-text md-state" style={{ height: 32, padding: "0 8px", fontSize: 13 }}>
                Open event
                <span className="material-symbols-rounded" style={{ fontSize: 16 }}>arrow_forward</span>
              </Link>
            </div>

            <VoteCard event={event} onRefresh={async () => {
              const res = await fetch(`/api/events/${event.id}`)
              const data = await res.json()
              if (data.event) setEvent(data.event)
            }} />

            {(stage === "voting" || stage === "quorum_reached") && (
              <DemoVotePanel event={event} onVote={handleDemoVote} />
            )}

            {/* Confirmed */}
            {stage === "confirmed" && event.scheduled_time && (
              <div className="md-card md-card-filled" style={{ padding: "32px 24px", textAlign: "center" }}>
                <div style={{
                  width: 64, height: 64, borderRadius: "var(--md-shape-full)",
                  background: "var(--md-tertiary-container)", color: "var(--md-on-tertiary-container)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 16px",
                }}>
                  <span className="material-symbols-rounded" style={{ fontSize: 32 }}>event_available</span>
                </div>
                <h2 className="md-headline-sm" style={{ color: "var(--md-on-surface)", marginBottom: 8 }}>You&apos;re all set!</h2>
                <p className="md-body-md" style={{ color: "var(--md-on-surface-variant)", marginBottom: 24, maxWidth: 360, margin: "0 auto 24px" }}>
                  <strong style={{ color: "var(--md-on-surface)" }}>{event.itinerary.title}</strong> is locked in for{" "}
                  <strong style={{ color: "var(--md-on-surface)" }}>{formatTime(event.scheduled_time)}</strong>.
                  Calendar invites sent to all confirmed members.
                </p>
                <button
                  className="md-btn md-btn-tonal md-state"
                  onClick={() => { setStage("idle"); setVideoContext(null); setItinerary(null); setEvent(null) }}
                >
                  <span className="material-symbols-rounded" style={{ fontSize: 18 }}>add</span>
                  Plan another event
                </button>
              </div>
            )}

            {origin && <McpCard event={event} origin={origin} />}
          </div>
        )}

        {/* How it works */}
        {stage === "idle" && !event && (
          <div style={{ marginTop: 8 }}>
            <p className="md-label-lg" style={{ color: "var(--md-on-surface-variant)", marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              How it works
            </p>
            <div className="md-card md-card-outlined" style={{ overflow: "hidden" }}>
              {[
                { icon: "download",      color: "var(--md-primary-container)",   onColor: "var(--md-on-primary-container)",   label: "Download",      desc: "yt-dlp grabs the MP4 from TikTok or Instagram Reels" },
                { icon: "smart_toy",     color: "var(--md-secondary-container)", onColor: "var(--md-on-secondary-container)", label: "Analyze",       desc: "Gemini 2.5 Flash watches the video — venue type, vibe, price signals" },
                { icon: "map",           color: "var(--md-tertiary-container)",  onColor: "var(--md-on-tertiary-container)",  label: "Plan",          desc: "AI builds a real itinerary using Google Maps venue hours, ratings & photos" },
                { icon: "chat_bubble",   color: "var(--md-primary-container)",   onColor: "var(--md-on-primary-container)",   label: "Vote via POKE", desc: "POKE texts your iMessage group — friends reply 👍 or 👎" },
                { icon: "calendar_add_on", color: "var(--md-secondary-container)", onColor: "var(--md-on-secondary-container)", label: "Schedule",    desc: "Quorum reached? Scheduling agent books Google Calendar for everyone" },
              ].map(({ icon, color, onColor, label, desc }, i, arr) => (
                <div key={label}>
                  {i > 0 && <div className="md-divider" style={{ marginLeft: 72 }} />}
                  <div className="md-list-item" style={{ minHeight: 72, padding: "12px 16px" }}>
                    <div className="md-list-item__leading" style={{ background: color, color: onColor }}>
                      <span className="material-symbols-rounded" style={{ fontSize: 20 }}>{icon}</span>
                    </div>
                    <div className="md-list-item__content">
                      <p className="md-list-item__headline" style={{ fontWeight: 500, fontSize: 15 }}>{label}</p>
                      <p className="md-list-item__supporting">{desc}</p>
                    </div>
                    <div className="md-list-item__trailing">
                      <span className="md-label-lg" style={{ color: "var(--md-on-surface-variant)", opacity: 0.6 }}>{i + 1}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Spinner keyframe */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
