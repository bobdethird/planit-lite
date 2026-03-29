"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import type { VideoContext, Itinerary, Event as PlanItEvent } from "@/lib/schemas"

export type AppStage =
  | "idle"
  | "downloading"
  | "analyzing"
  | "planning"
  | "voting"
  | "quorum_reached"
  | "scheduling"
  | "confirmed"

export interface PipelineState {
  stage: AppStage
  error: string | null
  videoContext: VideoContext | null
  itinerary: Itinerary | null
  event: PlanItEvent | null
}

export interface PipelineActions {
  run: (url: string) => Promise<void>
  vote: (phone: string, vote: "yes" | "no") => Promise<void>
  refreshEvent: () => Promise<void>
  reset: () => void
}

export function usePipeline(): [PipelineState, PipelineActions] {
  const [stage, setStage] = useState<AppStage>("idle")
  const [error, setError] = useState<string | null>(null)
  const [videoContext, setVideoContext] = useState<VideoContext | null>(null)
  const [itinerary, setItinerary] = useState<Itinerary | null>(null)
  const [event, setEvent] = useState<PlanItEvent | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

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
          if (data.event.status === "confirmed") {
            setStage("confirmed")
            clearInterval(pollRef.current!)
          }
        }
      } catch { /* ignore */ }
    }, 3000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event?.id, event?.status])

  const run = useCallback(async (rawUrl: string) => {
    const trimmed = rawUrl.trim()
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
    } catch { setError("Download failed. Check your URL and try again."); setStage("idle"); return }

    setStage("analyzing")
    let vc: VideoContext
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Analysis failed"); setStage("idle"); return }
      vc = data.videoContext
      setVideoContext(vc)
    } catch { setError("Video analysis failed — try again"); setStage("idle"); return }

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
    } catch { setError("Planning failed"); setStage("idle"); return }

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
    } catch { setError("Failed to create event"); setStage("idle") }
  }, [])

  const vote = useCallback(async (phone: string, v: "yes" | "no") => {
    if (!event) return
    try {
      await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: event.id, phone, vote: v }),
      })
      const res = await fetch(`/api/events/${event.id}`)
      const data = await res.json()
      if (data.event) {
        setEvent(data.event)
        if (data.event.status === "quorum_reached") {
          setStage("scheduling")
          await fetch("/api/schedule", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ event_id: data.event.id }),
          })
          const res2 = await fetch(`/api/events/${event.id}`)
          const data2 = await res2.json()
          if (data2.event) {
            setEvent(data2.event)
            if (data2.event.status === "confirmed") setStage("confirmed")
          }
        }
      }
    } catch { /* ignore */ }
  }, [event])

  const refreshEvent = useCallback(async () => {
    if (!event) return
    try {
      const res = await fetch(`/api/events/${event.id}`)
      const data = await res.json()
      if (data.event) setEvent(data.event)
    } catch { /* ignore */ }
  }, [event])

  const reset = useCallback(() => {
    setStage("idle")
    setError(null)
    setVideoContext(null)
    setItinerary(null)
    setEvent(null)
  }, [])

  return [
    { stage, error, videoContext, itinerary, event },
    { run, vote, refreshEvent, reset },
  ]
}
