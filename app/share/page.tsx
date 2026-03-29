"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { usePipeline } from "@/lib/hooks/use-pipeline"
import { ItineraryExplorer } from "@/components/ItineraryExplorer"
import {
  Download,
  Bot,
  Map,
  Vote,
  CalendarCheck,
  Check,
  AlertCircle,
  ArrowRight,
  Loader2,
  Link2,
  Send,
  Sparkles,
  MapPin,
  Clock,
  Zap,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { AppStage } from "@/lib/hooks/use-pipeline"

const TIKTOK_URL_RE = /https?:\/\/(?:(?:www|vm|vt)\.)?tiktok\.com\/[^\s)]+/i
const INSTAGRAM_URL_RE = /https?:\/\/(?:www\.)?instagram\.com\/[^\s)]+/i

function extractSocialUrl(text: string): string | null {
  const tiktok = text.match(TIKTOK_URL_RE)
  if (tiktok) return tiktok[0]
  const ig = text.match(INSTAGRAM_URL_RE)
  if (ig) return ig[0]
  return null
}

const STEPS: { stage: AppStage; label: string; icon: React.ElementType; msg: string }[] = [
  { stage: "downloading", label: "Download", icon: Download, msg: "Grabbing the video…" },
  { stage: "analyzing", label: "Analyze", icon: Bot, msg: "Analyzing your vibe…" },
  { stage: "planning", label: "Plan", icon: Map, msg: "Building your itinerary…" },
  { stage: "voting", label: "Vote", icon: Vote, msg: "Ready for your crew" },
  { stage: "confirmed", label: "Done", icon: CalendarCheck, msg: "You're all set!" },
]

const STAGE_ORDER: AppStage[] = ["downloading", "analyzing", "planning", "voting", "confirmed"]

export default function SharePage() {
  return (
    <Suspense fallback={<LoadingShell />}>
      <SharePageInner />
    </Suspense>
  )
}

function LoadingShell() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#000]">
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-12 w-12">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-400 opacity-40 blur-xl" />
          <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-400">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
        </div>
        <p className="text-sm font-medium text-white/50">Loading PlanIt…</p>
      </div>
    </div>
  )
}

function SharePageInner() {
  const searchParams = useSearchParams()
  const [{ stage, error, itinerary, event }, actions] = usePipeline()
  const didRun = useRef(false)
  const [sharedUrl, setSharedUrl] = useState<string | null>(null)
  const [manualUrl, setManualUrl] = useState("")
  const [dots, setDots] = useState("")

  // Animated dots for loading text
  useEffect(() => {
    const t = setInterval(() => setDots(d => d.length >= 3 ? "" : d + "."), 500)
    return () => clearInterval(t)
  }, [])

  // Auto-run pipeline from share params
  useEffect(() => {
    if (didRun.current) return

    const urlParam = searchParams.get("url") || ""
    const textParam = searchParams.get("text") || ""

    let resolved = extractSocialUrl(urlParam) || extractSocialUrl(textParam)
    if (!resolved && urlParam) {
      try {
        const u = new URL(urlParam)
        if (u.hostname.includes("tiktok") || u.hostname.includes("instagram")) {
          resolved = urlParam
        }
      } catch { /* not a URL */ }
    }

    if (resolved) {
      didRun.current = true
      setSharedUrl(resolved)
      actions.run(resolved)
    }
  }, [searchParams, actions])

  function handleManualSubmit() {
    const trimmed = manualUrl.trim()
    if (!trimmed) return
    didRun.current = true
    setSharedUrl(trimmed)
    setManualUrl("")
    actions.run(trimmed)
  }

  const isProcessing = ["downloading", "analyzing", "planning", "scheduling"].includes(stage)
  const curIdx = STAGE_ORDER.indexOf(stage)
  const curStep = STEPS.find(s => s.stage === stage)
  const isDone = stage === "voting" || stage === "confirmed" || stage === "quorum_reached"

  // Dark fullscreen processing view
  if (isProcessing) {
    return (
      <div className="flex min-h-dvh flex-col bg-[#000]" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        {/* Ambient glow */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div
            className="absolute left-1/2 top-1/3 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.08]"
            style={{ background: "radial-gradient(circle, #FF6B00, transparent 70%)" }}
          />
        </div>

        <div className="relative flex flex-1 flex-col items-center justify-center px-8">
          {/* Pulsing icon */}
          <div className="relative mb-8">
            <div className="absolute inset-0 scale-[2] rounded-3xl bg-gradient-to-br from-orange-500 to-amber-400 opacity-20 blur-2xl" style={{ animation: "pulse 2.5s ease-in-out infinite" }} />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-orange-500 to-amber-400 shadow-[0_0_60px_rgba(255,107,0,0.3)]">
              {curStep && <curStep.icon className="h-9 w-9 text-white" />}
            </div>
          </div>

          {/* Status text */}
          <h1 className="mb-2 text-center text-2xl font-bold tracking-tight text-white">
            {curStep?.msg ?? "Processing…"}{dots}
          </h1>
          <p className="mb-10 text-center text-sm text-white/40">
            {stage === "downloading" && "Fetching the video from TikTok"}
            {stage === "analyzing" && "Gemini is watching and listening to the reel"}
            {stage === "planning" && "Crafting a multi-stop itinerary with real venues"}
            {stage === "scheduling" && "Finding the perfect time for everyone"}
          </p>

          {/* Progress steps */}
          <div className="flex w-full max-w-xs items-center gap-1">
            {STEPS.slice(0, 3).map(({ stage: s, label }, i) => {
              const idx = STAGE_ORDER.indexOf(s)
              const done = idx < curIdx
              const active = idx === curIdx
              return (
                <div key={s} className="flex flex-1 items-center gap-1">
                  <div className="flex flex-1 flex-col items-center gap-1.5">
                    <div
                      className={cn(
                        "h-1 w-full rounded-full transition-all duration-700",
                        done ? "bg-orange-500" : active ? "overflow-hidden bg-white/10" : "bg-white/[0.06]"
                      )}
                    >
                      {active && (
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400"
                          style={{ width: "60%", animation: "indeterminate 2s infinite cubic-bezier(0.4,0,0.2,1)" }}
                        />
                      )}
                    </div>
                    <span className={cn(
                      "text-[10px] font-medium transition-colors",
                      done ? "text-orange-400" : active ? "text-white/70" : "text-white/20"
                    )}>
                      {done ? <Check className="inline h-3 w-3" /> : label}
                    </span>
                  </div>
                  {i < 2 && <div className="mb-4 h-px w-2 shrink-0" />}
                </div>
              )
            })}
          </div>

          {/* Source URL pill */}
          {sharedUrl && (
            <div className="mt-10 flex max-w-full items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.04] px-4 py-2">
              <Link2 className="h-3 w-3 shrink-0 text-white/30" />
              <p className="min-w-0 truncate text-xs text-white/30">{sharedUrl}</p>
            </div>
          )}
        </div>

        <style>{`
          @keyframes indeterminate {
            0% { transform: translateX(-100%); width: 60%; }
            50% { transform: translateX(40%); width: 80%; }
            100% { transform: translateX(200%); width: 60%; }
          }
        `}</style>
      </div>
    )
  }

  // Idle — no URL detected, manual input
  if (!sharedUrl && stage === "idle") {
    return (
      <div className="flex min-h-dvh flex-col bg-[#000]" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div
            className="absolute left-1/2 top-1/4 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.06]"
            style={{ background: "radial-gradient(circle, #FF6B00, transparent 60%)" }}
          />
        </div>

        <div className="relative flex flex-1 flex-col items-center justify-center px-6">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-400 shadow-[0_0_40px_rgba(255,107,0,0.2)]">
            <Zap className="h-8 w-8 text-white" />
          </div>

          <h1 className="mb-2 text-center text-3xl font-bold tracking-tight text-white">
            Drop a reel
          </h1>
          <p className="mb-8 max-w-[280px] text-center text-sm leading-relaxed text-white/40">
            Paste a TikTok or Instagram link and PlanIt will build a group itinerary from it.
          </p>

          <form onSubmit={(e) => { e.preventDefault(); handleManualSubmit() }} className="w-full max-w-sm">
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] p-2 backdrop-blur-xl">
              <Link2 className="ml-2 h-5 w-5 shrink-0 text-white/25" />
              <input
                value={manualUrl}
                onChange={(e) => setManualUrl(e.target.value)}
                placeholder="https://vm.tiktok.com/..."
                className="min-w-0 flex-1 border-0 bg-transparent text-sm text-white outline-none placeholder:text-white/20"
                autoFocus
              />
              <button
                type="submit"
                disabled={!manualUrl.trim()}
                className="flex min-h-[36px] items-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-400 px-4 text-sm font-semibold text-white shadow-lg transition-all hover:brightness-110 disabled:opacity-30"
              >
                <Send className="h-3.5 w-3.5" />
                Go
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  // Result view — itinerary is ready
  return (
    <div className="min-h-dvh bg-[#000]" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-white/[0.06] bg-[#000]/90 px-5 py-3 backdrop-blur-xl" style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)" }}>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-amber-400">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <span className="text-base font-bold text-white">PlanIt</span>
        {isDone && (
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-400">
            <Check className="h-3 w-3" /> Ready
          </span>
        )}
      </header>

      <main className="space-y-5 px-4 pb-32 pt-5">
        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
            <div>
              <p className="text-sm font-medium text-red-300">{error}</p>
              <button
                onClick={() => { actions.reset(); setSharedUrl(null) }}
                className="mt-2 text-xs font-medium text-red-400 underline underline-offset-2"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {/* Itinerary */}
        {itinerary && (
          <div style={{ animation: "fadeUp 0.6s ease-out" }}>
            <ItineraryExplorer itinerary={itinerary} />
          </div>
        )}

        {/* Event created card */}
        {event && (
          <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.04]" style={{ animation: "fadeUp 0.5s ease-out 0.2s both" }}>
            <div className="p-5 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10">
                <CalendarCheck className="h-7 w-7 text-emerald-400" />
              </div>
              <h2 className="text-lg font-bold text-white">
                Itinerary ready!
              </h2>
              <p className="mt-1 text-sm text-white/50">
                <strong className="text-white/80">{event.itinerary.title}</strong> has been created for your crew.
              </p>

              {/* Quick stats */}
              <div className="mt-4 flex justify-center gap-4">
                <div className="flex items-center gap-1.5 text-xs text-white/40">
                  <MapPin className="h-3 w-3" />
                  {event.itinerary.venue_name}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-white/40">
                  <Clock className="h-3 w-3" />
                  {event.itinerary.duration_hrs}h
                </div>
              </div>

              <Link
                href={`/events/${event.id}`}
                className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-400 px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:brightness-110"
              >
                Open event <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        )}

        {/* Source URL */}
        {sharedUrl && isDone && (
          <div className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-2.5">
            <Link2 className="h-3 w-3 shrink-0 text-white/20" />
            <p className="min-w-0 truncate text-xs text-white/20">{sharedUrl}</p>
          </div>
        )}
      </main>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
