"use client"

import Link from "next/link"
import { useState, useEffect, useCallback } from "react"
import type { VideoContext, Event as PlanItEvent } from "@/lib/schemas"
import { ItineraryExplorer } from "@/components/ItineraryExplorer"
import { HeroSection } from "@/components/HeroSection"
import { HomeInputBar } from "@/components/HomeInputBar"
import { ExampleCards } from "@/components/ExampleCards"
import { PlatformHint } from "@/components/PlatformHint"
import { usePipeline, type AppStage } from "@/lib/hooks/use-pipeline"
import {
  Download,
  Bot,
  Map,
  Vote,
  CalendarCheck,
  Send,
  CheckCircle,
  XCircle,
  Check,
  AlertCircle,
  Zap,
  RefreshCw,
  FlaskConical,
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
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { cn } from "@/lib/utils"

type AnimPhase = "logo" | "shrink" | "app"

const PIPELINE: {
  stage: AppStage
  label: string
  icon: React.ElementType
  sub: string
}[] = [
  { stage: "downloading", label: "Download", icon: Download, sub: "Grabbing your video" },
  { stage: "analyzing", label: "Analyze", icon: Bot, sub: "Reading the vibe" },
  { stage: "planning", label: "Plan", icon: Map, sub: "Crafting your itinerary" },
  { stage: "voting", label: "Vote", icon: Vote, sub: "Waiting on the crew" },
  { stage: "confirmed", label: "Confirm", icon: CalendarCheck, sub: "Locking it in" },
]

const PIPELINE_ORDER: AppStage[] = [
  "downloading", "analyzing", "planning", "voting", "scheduling", "confirmed",
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
        fill="#E8713A"
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
      <circle cx="256" cy="182" r="8.5" fill="#E8713A" />
    </svg>
  )
}

// ─── Launch Animation ─────────────────────────────────────────────────────────

function LaunchOverlay({ phase }: { phase: AnimPhase }) {
  if (phase === "app") return null

  return (
    <>
      <div
        className="fixed inset-0 z-[100] bg-black"
        style={{
          opacity: phase === "shrink" ? 0 : 1,
          transition: "opacity 0.5s ease-out 0.1s",
        }}
      />
      <div
        className="fixed z-[110]"
        style={{
          top: phase === "logo" ? "50%" : "11px",
          left: phase === "logo" ? "50%" : "16px",
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
            background: "black",
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
    $: DollarSign, $$: CreditCard, $$$: Gem, $$$$: Gem,
  }
  const CatIcon = catIcon[context.activity_category] ?? Compass
  const PriceIcon = priceIcon[context.price_range] ?? DollarSign

  return (
    <div className="card-shadow rounded-2xl bg-[#F5F5F5] p-5">
      <div className="mb-4 flex items-center gap-2.5">
        <div className="h-2 w-2 rounded-full bg-[#10B981]" />
        <span className="text-sm font-semibold text-black">Vibe analysis</span>
        <span className="ml-auto text-xs text-[#888]">AI-powered</span>
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
            className="card-shadow inline-flex items-center gap-1.5 rounded-3xl bg-white px-3 py-1.5 text-xs font-medium text-black"
          >
            <Icon className="h-3.5 w-3.5 text-[#888]" />
            {label}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {[
          { label: "Venue type", value: context.venue_type },
          { label: "Vibe", value: context.vibe },
        ].map(({ label, value }) => (
          <div key={label}>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#888]">{label}</p>
            <p className="mt-1 text-sm font-semibold text-black">{value}</p>
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
    <div className="card-shadow rounded-2xl bg-white p-5">
      <div className="mb-5 flex items-center gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FFF2E8]">
          <StepIcon className="h-5 w-5 text-[#E8713A]" style={{ animation: "spin 1.5s linear infinite" }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-black">
            {stage === "downloading" && "Downloading your reel…"}
            {stage === "analyzing" && "Reading the vibe…"}
            {stage === "planning" && "Building your itinerary…"}
            {stage === "scheduling" && "Finding the best time…"}
          </p>
          <p className="mt-0.5 text-xs text-[#888]">{step?.sub}</p>
        </div>
      </div>

      <div className="mb-3 h-1 overflow-hidden rounded-full bg-[#F5F5F5]">
        <div
          className="h-full rounded-full bg-[#E8713A]"
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
                "flex h-6 flex-1 items-center justify-center rounded-[10px] transition-colors",
                done ? "bg-[#E8713A] text-white"
                  : active ? "bg-[#FFF2E8] text-[#E8713A]"
                  : "bg-[#F5F5F5] text-[#888]"
              )}>
                {done ? <Check className="h-3 w-3" /> : <span className="text-[10px] font-semibold">{label}</span>}
              </div>
              {i < PIPELINE.length - 1 && (
                <div className={cn("h-px w-1 shrink-0", done ? "bg-[#E8713A]" : "bg-[#F5F5F5]")} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

const AVATAR_COLORS = ["#E8713A", "#3B82F6", "#10B981", "#8B5CF6", "#EC4899", "#EAB308"]

function VoteCard({ event, onRefresh, onVote, pokeButton }: {
  event: PlanItEvent
  onRefresh: () => void
  onVote?: (phone: string, vote: "yes" | "no") => void
  pokeButton?: React.ReactNode
}) {
  const yes = event.votes.filter((v) => v.vote === "yes").length
  const total = event.group.members.length
  const pct = Math.min(100, (yes / total) * 100)
  const quorum = Math.ceil(total * event.quorum_threshold)

  return (
    <div className="card-shadow overflow-hidden rounded-2xl bg-white">
      {/* Progress bar at very top */}
      <div className="h-1 bg-[#F5F5F5]">
        <div
          className="h-full rounded-r-full bg-[#E8713A] transition-all"
          style={{ width: `${pct}%`, transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)" }}
        />
      </div>

      <div className="flex items-center justify-between px-5 py-3">
        <div>
          <span className="text-sm font-bold text-black">Group vote</span>
          <p className="text-xs text-[#888]">{yes} of {total} responded · need {quorum}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn(
            "inline-flex items-center gap-1 rounded-3xl px-2.5 py-1 text-[11px] font-semibold",
            event.status === "confirmed"
              ? "bg-[#ECFDF5] text-[#10B981]"
              : "bg-[#FFF2E8] text-[#E8713A]"
          )}>
            {event.status === "confirmed" ? "Confirmed" : "Voting"}
          </span>
          <button onClick={onRefresh} className="rounded-xl p-1.5 text-[#888] transition-colors hover:bg-[#F5F5F5]" aria-label="Refresh">
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
                  <span className="text-xs text-[#888]">Waiting…</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {event.status === "quorum_reached" && (
        <div className="mx-5 mb-4 flex items-center gap-2.5 rounded-xl bg-[#FFF2E8] p-3">
          <Zap className="h-4 w-4 shrink-0 text-[#E8713A]" />
          <p className="text-xs font-medium text-[#E8713A]">Quorum reached! Finding the best time…</p>
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

      {/* Integrated POKE button */}
      {pokeButton && (
        <div className="border-t border-[rgba(0,0,0,0.04)] px-5 py-3">
          {pokeButton}
        </div>
      )}
    </div>
  )
}

function PokeNotifyButton({ eventId }: { eventId: string }) {
  const [pokeState, setPokeState] = useState<"idle" | "sending" | "sent" | "error">("idle")
  const [pokeResult, setPokeResult] = useState<{ succeeded: number; failed: number } | null>(null)

  const sendPoke = useCallback(async () => {
    setPokeState("sending")
    try {
      const res = await fetch("/api/poke-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: eventId }),
      })
      const data = await res.json()
      if (!res.ok) { setPokeState("error"); return }
      setPokeResult({ succeeded: data.succeeded, failed: data.failed })
      setPokeState("sent")
    } catch {
      setPokeState("error")
    }
  }, [eventId])

  return (
    <button
      onClick={sendPoke}
      disabled={pokeState === "sending" || pokeState === "sent"}
      className={cn(
        "flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all",
        pokeState === "sent"
          ? "bg-[#ECFDF5] text-[#10B981]"
          : pokeState === "error"
            ? "bg-red-50 text-[#EF4444] hover:bg-red-100"
            : "bg-[#E8713A] text-white hover:brightness-110 disabled:opacity-50"
      )}
    >
      {pokeState === "sending" && <Loader2 className="h-4 w-4 animate-spin" />}
      {pokeState === "sent" && <CheckCircle className="h-4 w-4" />}
      {pokeState === "idle" && <Send className="h-4 w-4" />}
      {pokeState === "error" && <AlertCircle className="h-4 w-4" />}
      {pokeState === "sending" ? "Sending via iMessage…"
        : pokeState === "sent" ? `Sent! ${pokeResult?.succeeded ?? 0} delivered`
        : pokeState === "error" ? "Retry sending"
        : "Send POKE iMessage to group"}
    </button>
  )
}

function DemoVotePanel({ event, onVote }: { event: PlanItEvent; onVote: (phone: string, vote: "yes" | "no") => void }) {
  return (
    <div className="rounded-2xl bg-[#F5F5F5] p-4">
      <div className="mb-3 flex items-center gap-2 text-[#888]">
        <FlaskConical className="h-4 w-4" />
        <p className="text-xs font-semibold">Demo — simulate friend votes</p>
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
                  : "bg-white"
              )}
            >
              <span className={cn(
                "text-sm font-medium",
                voted?.vote === "yes" ? "text-[#10B981]"
                  : voted?.vote === "no" ? "text-[#EF4444]"
                  : "text-black"
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
    <div className="overflow-hidden rounded-2xl bg-black p-5">
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
  const [{ stage, error, videoContext, itinerary, event }, actions] = usePipeline()
  const [origin, setOrigin] = useState("")
  const [scrolled, setScrolled] = useState(false)
  const [phase, setPhase] = useState<AnimPhase>("logo")
  const [devOpen, setDevOpen] = useState(false)

  useEffect(() => { setOrigin(window.location.origin) }, [])
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4)
    window.addEventListener("scroll", onScroll)
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("shrink"), 1600)
    const t2 = setTimeout(() => setPhase("app"), 2200)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  useEffect(() => {
    async function checkClipboard() {
      if (stage !== "idle" && stage !== "confirmed") return
      try {
        const text = await navigator.clipboard.readText()
        const match = text.match(/https?:\/\/(?:(?:www|vm|vt)\.)?tiktok\.com\/[^\s)]+/i)
          || text.match(/https?:\/\/(?:www\.)?instagram\.com\/[^\s)]+/i)
        if (match) setUrl(match[0])
      } catch { /* clipboard denied */ }
    }
    window.addEventListener("focus", checkClipboard)
    checkClipboard()
    return () => window.removeEventListener("focus", checkClipboard)
  }, [stage])

  async function handleAnalyze() {
    const trimmed = url.trim()
    if (!trimmed) return
    setUrl("")
    await actions.run(trimmed)
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData("text")
    const match = text.match(/https?:\/\/(?:(?:www|vm|vt)\.)?tiktok\.com\/[^\s)]+/i)
      || text.match(/https?:\/\/(?:www\.)?instagram\.com\/[^\s)]+/i)
    if (match) {
      e.preventDefault()
      const extracted = match[0]
      setUrl(extracted)
      setTimeout(() => { setUrl(""); actions.run(extracted) }, 150)
    }
  }

  const isProcessing = ["downloading", "analyzing", "planning", "scheduling"].includes(stage)
  const showInput = stage === "idle" || stage === "confirmed"
  const appVisible = phase === "app"

  return (
    <>
      <LaunchOverlay phase={phase} />

      <div style={{ opacity: appVisible ? 1 : 0, transition: "opacity 0.4s ease-out" }}>
        {/* ── Sticky Top Bar ──────────────────────────────────────────── */}
        <header
          className={cn(
            "sticky top-0 z-40 flex items-center gap-2.5 bg-[#FAF9F6] px-4 transition-shadow",
            scrolled && "shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
          )}
          style={{
            borderBottom: "1px solid rgba(0,0,0,0.06)",
            paddingTop: "env(safe-area-inset-top, 0px)",
            minHeight: "calc(48px + env(safe-area-inset-top, 0px))",
          }}
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-black">
            <PlanItLogo size={17} />
          </div>
          <span className="text-lg font-bold text-black">PlanIt</span>

          <div className="ml-auto flex items-center gap-2">
            {stage !== "idle" && (
              <span className={cn(
                "inline-flex items-center gap-1 rounded-3xl px-2.5 py-1 text-[11px] font-semibold",
                stage === "confirmed" ? "bg-[#ECFDF5] text-[#10B981]"
                  : "bg-[#E8713A] text-white"
              )}>
                {isProcessing && <Loader2 className="h-3 w-3 animate-spin" />}
                {stage === "confirmed" && <CheckCircle className="h-3 w-3" />}
                {stage === "confirmed" ? "Confirmed"
                  : stage === "voting" ? "Voting"
                  : stage === "quorum_reached" ? "Quorum"
                  : stage === "downloading" ? "Downloading"
                  : stage === "analyzing" ? "Analyzing"
                  : stage === "planning" ? "Planning"
                  : stage === "scheduling" ? "Scheduling"
                  : "Active"}
              </span>
            )}
          </div>
        </header>

        {/* ── Content ─────────────────────────────────────────────────── */}
        <main className="space-y-6 overflow-x-hidden px-4 pt-6 pb-8">
          {/* Itinerary title card (when itinerary exists) */}
          {itinerary && !isProcessing && (
            <div className="anim-fade-in-card">
              <h1 className="text-2xl font-bold tracking-tight text-black">{itinerary.title}</h1>
              <div className="mt-1.5 flex items-center gap-2">
                <p className="text-sm text-[#888]">
                  {itinerary.venue_name}
                  {itinerary.suggested_date_range?.start && (
                    <> · {new Date(itinerary.suggested_date_range.start).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</>
                  )}
                </p>
                {stage !== "idle" && (
                  <span className="rounded-3xl bg-[#E8713A] px-2 py-0.5 text-[10px] font-semibold text-white">
                    {stage === "confirmed" ? "Confirmed" : "Live"}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Idle home screen */}
          {showInput && (
            <>
              <HeroSection />
              <HomeInputBar
                url={url}
                setUrl={setUrl}
                onSubmit={handleAnalyze}
                onPaste={handlePaste}
              />
              {stage === "idle" && (
                <>
                  <ExampleCards />
                  <PlatformHint />
                </>
              )}
            </>
          )}

          {/* Pipeline */}
          {isProcessing && (
            <div className="anim-fade-in-card"><PipelineCard stage={stage} /></div>
          )}

          {/* Error */}
          {error && (
            <div className="card-shadow flex items-start gap-3 rounded-2xl bg-red-50 p-4 text-[#EF4444]">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Vibe analysis */}
          {videoContext && (
            <div className="anim-fade-in-card"><VibeChips context={videoContext} /></div>
          )}

          {/* Itinerary */}
          {itinerary && (
            <div className="anim-fade-in-card"><ItineraryExplorer itinerary={itinerary} /></div>
          )}

          {/* Event / voting */}
          {event && stage !== "idle" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <p className="font-mono text-[11px] text-[#888]">event · {event.id.slice(0, 8)}…</p>
                <Link
                  href={`/events/${event.id}`}
                  className="flex items-center gap-1 text-xs font-semibold text-[#E8713A]"
                >
                  Open event <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <VoteCard
                event={event}
                onRefresh={actions.refreshEvent}
                pokeButton={(stage === "voting" || stage === "quorum_reached") ? <PokeNotifyButton eventId={event.id} /> : undefined}
              />

              {/* Confirmed */}
              {stage === "confirmed" && event.scheduled_time && (
                <div className="card-shadow rounded-2xl bg-white py-8 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#ECFDF5]">
                    <CalendarCheck className="h-8 w-8 text-[#10B981]" />
                  </div>
                  <h2 className="text-xl font-bold text-black">You&apos;re all set!</h2>
                  <p className="mx-auto mt-2 mb-6 max-w-[320px] text-sm text-[#888]">
                    <strong className="text-black">{event.itinerary.title}</strong> is locked in for{" "}
                    <strong className="text-black">{formatTime(event.scheduled_time)}</strong>.
                    Calendar invites sent to all confirmed members.
                  </p>
                  <button
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#F5F5F5] px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-[#EBEBEB]"
                    onClick={actions.reset}
                  >
                    <Plus className="h-4 w-4" /> Plan another event
                  </button>
                </div>
              )}

              {/* Developer Tools (collapsed by default) */}
              {(stage === "voting" || stage === "quorum_reached" || origin) && (
                <div className="pt-4">
                  <button
                    onClick={() => setDevOpen(!devOpen)}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold text-[#888] transition-colors hover:bg-[#F5F5F5]"
                  >
                    {devOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    {devOpen ? "Hide" : "Dev tools"}
                  </button>
                  {devOpen && (
                    <div className="mt-3 space-y-3">
                      {(stage === "voting" || stage === "quorum_reached") && (
                        <DemoVotePanel event={event} onVote={actions.vote} />
                      )}
                      {origin && <McpCard event={event} origin={origin} />}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </>
  )
}
