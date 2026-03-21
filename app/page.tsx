"use client"

import Link from "next/link"
import { useState, useEffect, useRef } from "react"
import type { VideoContext, Itinerary, Event as PlanItEvent } from "@/lib/schemas"
import { ItineraryExplorer } from "@/components/ItineraryExplorer"
import {
  Download,
  Mic,
  Bot,
  Map,
  Vote,
  CalendarCheck,
  Send,
  Link2,
  CheckCircle,
  XCircle,
  Check,
  AlertCircle,
  Zap,
  RefreshCw,
  FlaskConical,
  Plug,
  Copy,
  ArrowRight,
  Plus,
  Clock,
  MapPin,
  Moon,
  UtensilsCrossed,
  Trees,
  Landmark,
  Dumbbell,
  Compass,
  DollarSign,
  CreditCard,
  Gem,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"

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

type AnimPhase = "logo" | "shrink" | "app"

const PIPELINE: {
  stage: AppStage
  label: string
  icon: React.ElementType
  sub: string
}[] = [
  { stage: "downloading", label: "Download", icon: Download, sub: "yt-dlp → mp4" },
  { stage: "transcribing", label: "Transcribe", icon: Mic, sub: "ElevenLabs Scribe v2" },
  { stage: "analyzing", label: "Analyze", icon: Bot, sub: "Gemini 3 Flash Preview" },
  { stage: "planning", label: "Plan", icon: Map, sub: "Gemini + Google Maps" },
  { stage: "voting", label: "Vote", icon: Vote, sub: "POKE iMessage" },
  { stage: "confirmed", label: "Confirm", icon: CalendarCheck, sub: "Google Calendar" },
]

const PIPELINE_ORDER: AppStage[] = [
  "downloading", "transcribing", "analyzing", "planning", "voting", "confirmed",
]

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit",
  })
}

// ─── Logo SVG ─────────────────────────────────────────────────────────────────

function PlanItLogo({ size = 20, animate = false }: { size?: number; animate?: boolean }) {
  return (
    <svg viewBox="0 0 512 512" width={size} height={size}>
      <path
        d="M256 62 C186 62 130 118 130 188 C130 268 256 430 256 430 C256 430 382 268 382 188 C382 118 326 62 256 62Z"
        fill="#F97316"
      />
      <ellipse
        cx="256" cy="198" rx="155" ry="38"
        fill="none" stroke="#FDBA74" strokeWidth="12" strokeLinecap="round"
        style={animate ? {
          strokeDasharray: 700,
          strokeDashoffset: 700,
          animation: "ring-draw 1.2s ease-out 0.3s forwards",
        } : undefined}
      />
      <circle cx="256" cy="182" r="20" fill="#FEFCE8" opacity="0.9" />
      <circle cx="256" cy="182" r="8.5" fill="#F97316" />
    </svg>
  )
}

// ─── Launch Animation ─────────────────────────────────────────────────────────

function LaunchOverlay({ phase }: { phase: AnimPhase }) {
  if (phase === "app") return null

  return (
    <>
      {/* Black backdrop */}
      <div
        className="fixed inset-0 z-[100] bg-[#0C0A09]"
        style={{
          opacity: phase === "shrink" ? 0 : 1,
          transition: "opacity 0.5s ease-out 0.1s",
        }}
      />

      {/* Animated logo */}
      <div
        className="fixed z-[110]"
        style={{
          top: phase === "logo" ? "50%" : "14px",
          left: phase === "logo" ? "50%" : "20px",
          transform: phase === "logo" ? "translate(-50%, -50%)" : "none",
          width: phase === "logo" ? "120px" : "32px",
          height: phase === "logo" ? "120px" : "32px",
          transition: phase === "shrink"
            ? "all 0.6s cubic-bezier(0.4, 0, 0.2, 1)"
            : "none",
        }}
      >
        <div
          className="flex h-full w-full items-center justify-center"
          style={phase === "logo" ? {
            animation: "glow-pulse 1.5s ease-in-out 0.5s 2",
          } : {
            background: "#0C0A09",
            borderRadius: "8px",
            padding: "6px",
          }}
        >
          <PlanItLogo
            size={phase === "logo" ? 120 : 20}
            animate={phase === "logo"}
          />
        </div>
      </div>
    </>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function VibeChips({ context }: { context: VideoContext }) {
  const catIcon: Record<string, React.ElementType> = {
    nightlife: Moon, food: UtensilsCrossed, outdoors: Trees,
    culture: Landmark, sports: Dumbbell, other: Compass,
  }
  const priceIcon: Record<string, React.ElementType> = {
    free: DollarSign, $: DollarSign, $$: CreditCard, $$$: Gem,
  }
  const CatIcon = catIcon[context.activity_category] ?? Compass
  const PriceIcon = priceIcon[context.price_range] ?? DollarSign

  return (
    <div className="card-shadow rounded-2xl border border-[#E7E5E4] bg-white p-5">
      <div className="mb-4 flex items-center gap-2.5">
        <div className="h-2 w-2 rounded-full bg-[#10B981]" />
        <span className="text-sm font-semibold text-[#1C1917]">Vibe analysis</span>
        <span className="ml-auto text-xs text-[#A8A29E]">Gemini 3 Flash Preview</span>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {[
          { Icon: CatIcon, label: context.activity_category },
          { Icon: PriceIcon, label: context.price_range },
          { Icon: Clock, label: `~${context.duration_estimate_hrs}h` },
          ...(context.location_hint ? [{ Icon: MapPin, label: context.location_hint }] : []),
        ].map(({ Icon, label }) => (
          <span
            key={label}
            className="inline-flex items-center gap-1.5 rounded-[10px] bg-[#F5F5F4] px-3 py-1.5 text-xs font-medium text-[#1C1917]"
          >
            <Icon className="h-3.5 w-3.5 text-[#78716C]" />
            {label}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Venue type", value: context.venue_type },
          { label: "Vibe", value: context.vibe },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl bg-[#F5F5F4] p-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-[#A8A29E]">{label}</p>
            <p className="mt-1 text-sm font-semibold text-[#1C1917]">{value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function PipelineCard({ stage }: { stage: AppStage }) {
  const curIdx = PIPELINE_ORDER.indexOf(stage)
  const step = PIPELINE.find((p) => p.stage === stage)
  const StepIcon = step?.icon ?? Loader2

  return (
    <div className="card-shadow rounded-2xl border border-[#E7E5E4] bg-white p-5">
      <div className="mb-5 flex items-center gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FFF7ED]">
          <StepIcon className="h-5 w-5 text-[#F97316]" style={{ animation: "spin 1.5s linear infinite" }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#1C1917]">
            {stage === "downloading" && "Downloading your reel…"}
            {stage === "transcribing" && "Transcribing audio…"}
            {stage === "analyzing" && "Gemini is watching the video…"}
            {stage === "planning" && "Building your itinerary…"}
            {stage === "scheduling" && "Finding the best time…"}
          </p>
          <p className="mt-0.5 text-xs text-[#A8A29E]">{step?.sub}</p>
        </div>
      </div>

      <div className="mb-3 h-1 overflow-hidden rounded-full bg-[#F5F5F4]">
        <div
          className="h-full rounded-full bg-[#F97316]"
          style={{ width: "35%", animation: "indeterminate 1.6s infinite cubic-bezier(0.4,0,0.2,1)" }}
        />
      </div>

      <div className="flex items-center gap-1">
        {PIPELINE.map(({ stage: s, label }, i) => {
          const idx = PIPELINE_ORDER.indexOf(s)
          const done = idx < curIdx
          const active = idx === curIdx
          return (
            <div key={s} className="flex flex-1 items-center gap-1">
              <div className={cn(
                "flex h-6 flex-1 items-center justify-center rounded-md transition-colors",
                done ? "bg-[#F97316] text-white"
                  : active ? "bg-[#FFF7ED] text-[#F97316]"
                  : "bg-[#F5F5F4] text-[#A8A29E]"
              )}>
                {done ? <Check className="h-3 w-3" /> : <span className="text-[10px] font-medium">{label}</span>}
              </div>
              {i < PIPELINE.length - 1 && (
                <div className={cn("h-px w-1 shrink-0", done ? "bg-[#F97316]" : "bg-[#E7E5E4]")} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

const AVATAR_COLORS = ["#F97316", "#3B82F6", "#10B981", "#8B5CF6", "#EC4899", "#EAB308"]

function VoteCard({ event, onRefresh }: { event: PlanItEvent; onRefresh: () => void }) {
  const yes = event.votes.filter((v) => v.vote === "yes").length
  const total = event.group.members.length
  const pct = Math.min(100, (yes / total) * 100)
  const quorum = Math.ceil(total * event.quorum_threshold)

  return (
    <div className="card-shadow overflow-hidden rounded-2xl border border-[#E7E5E4] bg-white">
      <div className="flex items-center justify-between border-b border-[#F5F5F4] px-5 py-3">
        <span className="text-sm font-semibold text-[#1C1917]">Group vote</span>
        <div className="flex items-center gap-2">
          <span className={cn(
            "inline-flex items-center gap-1 rounded-[10px] px-2.5 py-1 text-[11px] font-semibold",
            event.status === "confirmed"
              ? "bg-[#ECFDF5] text-[#10B981]"
              : "bg-[#FFF7ED] text-[#F97316]"
          )}>
            {event.status === "confirmed" ? "Confirmed" : "Voting"}
          </span>
          <button onClick={onRefresh} className="rounded-lg p-1.5 text-[#A8A29E] transition-colors hover:bg-[#F5F5F4] hover:text-[#1C1917]" aria-label="Refresh">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="px-5 pt-4">
        <p className="mb-2 text-xs text-[#78716C]">
          {yes} of {total} responded · need {quorum} for quorum
        </p>
        <div className="h-1.5 overflow-hidden rounded-full bg-[#F5F5F4]">
          <div
            className="h-full rounded-full bg-[#F97316] transition-all"
            style={{ width: `${pct}%`, transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)" }}
          />
        </div>
      </div>

      <div className="divide-y divide-[#F5F5F4] px-5">
        {event.group.members.map((member, mi) => {
          const vote = event.votes.find((v) => v.user_id === member.id)
          const initial = member.name[0]?.toUpperCase() ?? "?"
          const color = AVATAR_COLORS[mi % AVATAR_COLORS.length]
          return (
            <div key={member.id} className="flex items-center gap-3 py-3">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: color }}
              >
                {initial}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[#1C1917]">{member.name}</p>
                <p className="text-xs text-[#A8A29E]">{member.phone}</p>
              </div>
              <div className="shrink-0">
                {vote ? (
                  vote.vote === "yes" ? (
                    <span className="flex items-center gap-1 text-xs font-semibold text-[#10B981]">
                      <CheckCircle className="h-4 w-4" /> In
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-semibold text-[#EF4444]">
                      <XCircle className="h-4 w-4" /> Skip
                    </span>
                  )
                ) : (
                  <span className="text-xs text-[#A8A29E]">Waiting…</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {event.status === "quorum_reached" && (
        <div className="mx-5 mb-4 flex items-center gap-2.5 rounded-xl bg-[#FFF7ED] p-3">
          <Zap className="h-4 w-4 shrink-0 text-[#F97316]" />
          <p className="text-xs font-medium text-[#F97316]">Quorum reached! Finding the best time…</p>
        </div>
      )}
      {event.status === "confirmed" && event.scheduled_time && (
        <div className="mx-5 mb-4 flex items-center gap-2.5 rounded-xl bg-[#ECFDF5] p-3">
          <CalendarCheck className="h-4 w-4 shrink-0 text-[#10B981]" />
          <p className="text-xs font-medium text-[#10B981]">
            Scheduled for <strong>{formatTime(event.scheduled_time)}</strong>
          </p>
        </div>
      )}
    </div>
  )
}

function DemoVotePanel({ event, onVote }: { event: PlanItEvent; onVote: (phone: string, vote: "yes" | "no") => void }) {
  return (
    <div className="card-shadow rounded-2xl border border-[#E7E5E4] bg-white p-5">
      <div className="mb-3 flex items-center gap-2 text-[#A8A29E]">
        <FlaskConical className="h-4 w-4" />
        <p className="text-xs font-medium">Demo — simulate friend votes</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {event.group.members.map((member) => {
          const voted = event.votes.find((v) => v.user_id === member.id)
          return (
            <div
              key={member.id}
              className={cn(
                "flex items-center justify-between rounded-xl p-3 transition-colors",
                voted?.vote === "yes" ? "bg-[#ECFDF5]"
                  : voted?.vote === "no" ? "bg-red-50"
                  : "bg-[#F5F5F4]"
              )}
            >
              <span className={cn(
                "text-sm font-medium",
                voted?.vote === "yes" ? "text-[#10B981]"
                  : voted?.vote === "no" ? "text-[#EF4444]"
                  : "text-[#1C1917]"
              )}>{member.name}</span>
              <div className="flex gap-1">
                {(["yes", "no"] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => onVote(member.phone, v)}
                    className={cn(
                      "rounded-lg px-2 py-1 text-sm transition-all hover:scale-110 active:scale-95",
                      voted?.vote === v && (v === "yes" ? "bg-[#10B981] text-white" : "bg-[#EF4444] text-white")
                    )}
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

function McpCard({ event, origin }: { event: PlanItEvent; origin: string }) {
  const [copied, setCopied] = useState(false)
  const url = `${origin}/api/mcp`
  const tools = ["get_group_contacts", "get_itinerary", "get_member_availability", "record_vote", "confirm_event"]

  return (
    <div className="overflow-hidden rounded-2xl bg-[#1C1917] p-5">
      <div className="mb-3 flex items-center gap-2.5">
        <div className="relative flex h-2 w-2 items-center justify-center">
          <span className="absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75" style={{ animation: "pulse-green 2s infinite" }} />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[#10B981]" />
        </div>
        <span className="text-sm font-semibold text-white">POKE MCP Server</span>
        <span className="ml-auto rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-medium text-[#10B981]">Connected</span>
      </div>

      <p className="mb-3 font-mono text-[11px] text-white/40">
        POST /api/mcp · event {event.id.slice(0, 8)}…
      </p>

      {origin && (
        <div className="mb-3 flex items-center gap-2">
          <div className="min-w-0 flex-1 truncate rounded-lg bg-white/5 px-3 py-2 font-mono text-[11px] text-white/50">
            {url}
          </div>
          <button
            className="flex items-center gap-1 rounded-lg px-3 py-2 text-[11px] font-medium text-white/70 transition-colors hover:bg-white/10"
            onClick={() => { void navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {tools.map((t) => (
          <span key={t} className="rounded-md bg-white/8 px-2 py-1 font-mono text-[10px] text-white/50">
            {t}()
          </span>
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
  const [event, setEvent] = useState<PlanItEvent | null>(null)
  const [origin, setOrigin] = useState("")
  const [scrolled, setScrolled] = useState(false)
  const [phase, setPhase] = useState<AnimPhase>("logo")
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => { setOrigin(window.location.origin) }, [])
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4)
    window.addEventListener("scroll", onScroll)
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  // Launch animation
  useEffect(() => {
    const t1 = setTimeout(() => setPhase("shrink"), 1600)
    const t2 = setTimeout(() => setPhase("app"), 2200)
    return () => { clearTimeout(t1); clearTimeout(t2) }
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

  const isProcessing = ["downloading", "transcribing", "analyzing", "planning", "scheduling"].includes(stage)
  const showInput = stage === "idle" || stage === "confirmed"
  const appVisible = phase === "app"

  return (
    <>
      <LaunchOverlay phase={phase} />

      <div style={{ opacity: appVisible ? 1 : 0, transition: "opacity 0.4s ease-out" }}>
        {/* ── Sticky Top Bar ──────────────────────────────────────────── */}
        <header
          className={cn(
            "sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-[#E7E5E4] bg-white/80 px-5 backdrop-blur-2xl transition-shadow",
            scrolled && "shadow-sm"
          )}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0C0A09]">
            <PlanItLogo size={20} />
          </div>
          <span className="font-editorial text-base font-semibold text-[#1C1917]">PlanIt</span>

          <div className="ml-auto flex items-center gap-2">
            {stage !== "idle" && (
              <span className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                stage === "confirmed" ? "bg-[#ECFDF5] text-[#10B981]"
                  : isProcessing ? "bg-[#FFF7ED] text-[#F97316]"
                  : "bg-[#FFF7ED] text-[#F97316]"
              )}>
                {isProcessing && <Loader2 className="h-3 w-3" style={{ animation: "spin 1s linear infinite" }} />}
                {stage === "confirmed" && <CheckCircle className="h-3 w-3" />}
                {stage === "confirmed" ? "Confirmed!" : stage === "voting" ? "Voting open" : stage.charAt(0).toUpperCase() + stage.slice(1) + "…"}
              </span>
            )}
          </div>
        </header>

        {/* ── Content ─────────────────────────────────────────────────── */}
        <main className="space-y-5 overflow-x-hidden px-5 pt-6">
          {/* Hero */}
          <div className="anim-fade-up" style={{ animationDelay: "0s" }}>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-[#F97316]">
              Zero to Agent Hackathon SF
            </p>
            <h2 className="font-editorial text-[28px] font-semibold leading-tight text-[#1C1917]">
              Drop a reel.<br />We&apos;ll plan the night.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[#78716C]">
              Gemini reads the vibe, Google Maps finds the venue, POKE texts your
              group on iMessage, and everyone&apos;s calendar gets booked.
            </p>
          </div>

          {/* Input bar */}
          {showInput && (
            <form onSubmit={(e) => { e.preventDefault(); handleAnalyze() }} className="anim-fade-up" style={{ animationDelay: "0.1s" }}>
              <div className="card-shadow flex items-center gap-2 rounded-2xl border border-[#E7E5E4] bg-white p-2">
                <Link2 className="ml-2 h-5 w-5 shrink-0 text-[#A8A29E]" />
                <input
                  value={url}
                  onChange={(e) => { setUrl(e.target.value); setError(null) }}
                  placeholder="Paste a TikTok or Instagram reel link…"
                  className="min-w-0 flex-1 border-0 bg-transparent text-sm text-[#1C1917] outline-none placeholder:text-[#A8A29E]"
                />
                <button
                  type="submit"
                  disabled={!url.trim()}
                  className="flex min-h-[36px] items-center gap-1.5 rounded-[10px] bg-[#1C1917] px-4 text-sm font-medium text-white transition-all hover:bg-[#292524] disabled:opacity-30"
                >
                  <Send className="h-3.5 w-3.5" />
                  Analyze
                </button>
              </div>
            </form>
          )}

          {/* Pipeline */}
          {isProcessing && (
            <div className="anim-fade-up"><PipelineCard stage={stage} /></div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-3 rounded-2xl bg-red-50 p-4 text-[#EF4444]">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Vibe analysis */}
          {videoContext && (
            <div className="anim-fade-up"><VibeChips context={videoContext} /></div>
          )}

          {/* Itinerary */}
          {itinerary && (
            <div className="anim-fade-up"><ItineraryExplorer itinerary={itinerary} /></div>
          )}

          {/* Event / voting */}
          {event && stage !== "idle" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="font-mono text-[11px] text-[#A8A29E]">event · {event.id.slice(0, 8)}…</p>
                <Link
                  href={`/events/${event.id}`}
                  className="flex items-center gap-1 text-xs font-medium text-[#F97316] transition-colors hover:text-[#EA580C]"
                >
                  Open event <ArrowRight className="h-3.5 w-3.5" />
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
                <div className="card-shadow rounded-2xl border border-[#E7E5E4] bg-white py-8 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#ECFDF5]">
                    <CalendarCheck className="h-8 w-8 text-[#10B981]" />
                  </div>
                  <h2 className="font-editorial text-xl font-semibold text-[#1C1917]">You&apos;re all set!</h2>
                  <p className="mx-auto mt-2 mb-6 max-w-[320px] text-sm text-[#78716C]">
                    <strong className="text-[#1C1917]">{event.itinerary.title}</strong> is locked in for{" "}
                    <strong className="text-[#1C1917]">{formatTime(event.scheduled_time)}</strong>.
                    Calendar invites sent to all confirmed members.
                  </p>
                  <button
                    className="inline-flex items-center gap-1.5 rounded-[10px] bg-[#F5F5F4] px-4 py-2 text-sm font-medium text-[#1C1917] transition-colors hover:bg-[#E7E5E4]"
                    onClick={() => { setStage("idle"); setVideoContext(null); setItinerary(null); setEvent(null) }}
                  >
                    <Plus className="h-4 w-4" /> Plan another event
                  </button>
                </div>
              )}

              {origin && <McpCard event={event} origin={origin} />}
            </div>
          )}
        </main>
      </div>
    </>
  )
}
