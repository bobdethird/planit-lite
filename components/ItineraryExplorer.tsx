"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import type { Itinerary, AgendaItem } from "@/lib/schemas"
import {
  MapPin,
  Star,
  CreditCard,
  ExternalLink,
  Calendar,
  ArrowLeft,
  ArrowRight,
  Route,
  Footprints,
  Map as MapIcon,
  Loader2,
  X,
  SkipBack,
  SkipForward,
  Play,
  Pause,
  RotateCcw,
  Navigation,
  Clock,
  Maximize2,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface MapStop {
  lat: number
  lng: number
  label: string
  stopNumber: number
  agendaIndices: number[]
}

const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
const STEP_HOLD_MS = 4500

function loadMapsApi(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") { reject(); return }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).google?.maps?.Map) { resolve(); return }
    const id = "gmaps-pi"
    if (document.getElementById(id)) {
      const wait = setInterval(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((window as any).google?.maps?.Map) { clearInterval(wait); resolve() }
      }, 100)
      setTimeout(() => { clearInterval(wait); reject(new Error("Maps load timeout")) }, 10000)
      return
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).gm_authFailure = () => {
      console.warn("[Maps] API key is invalid")
      reject(new Error("InvalidKeyMapError"))
    }
    const s = document.createElement("script")
    s.id = id
    s.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&libraries=places`
    s.async = true
    s.onload = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((window as any).google?.maps?.Map) resolve()
      else setTimeout(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((window as any).google?.maps?.Map) resolve()
        else reject(new Error("Maps API loaded but Map constructor unavailable"))
      }, 500)
    }
    s.onerror = () => reject(new Error("Maps script failed to load"))
    document.head.appendChild(s)
  })
}

function markerSvg(num: number, active: boolean): string {
  const bg = active ? "#FF6B00" : "#888"
  return `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="44" viewBox="0 0 36 44">
    <circle cx="18" cy="18" r="16" fill="${bg}" stroke="white" stroke-width="2.5"/>
    <text x="18" y="18" text-anchor="middle" dominant-baseline="central" fill="white" font-family="system-ui,sans-serif" font-size="13" font-weight="700">${num}</text>
    <path d="M12 33 L18 43 L24 33" fill="${bg}"/>
  </svg>`
}

function pulsingMarkerSvg(num: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="76" viewBox="0 0 64 76">
    <circle cx="32" cy="32" r="28" fill="#FF6B00" opacity="0.18">
      <animate attributeName="r" values="18;28;18" dur="1.8s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0.35;0.08;0.35" dur="1.8s" repeatCount="indefinite"/>
    </circle>
    <circle cx="32" cy="32" r="16" fill="#FF6B00" stroke="white" stroke-width="2.5"/>
    <text x="32" y="32" text-anchor="middle" dominant-baseline="middle" fill="white" font-family="system-ui,sans-serif" font-size="13" font-weight="700">${num}</text>
    <path d="M25 50 L32 64 L39 50" fill="#FF6B00"/>
  </svg>`
}

function buildMapStops(itinerary: Itinerary): MapStop[] {
  const stops: MapStop[] = []
  const seenByName = new Map<string, number>()
  const seenByCoord = new Map<string, number>()

  const addOrMerge = (lat: number, lng: number, label: string, idx: number) => {
    const nameKey = label.toLowerCase().trim()
    const coordKey = `${lat.toFixed(3)},${lng.toFixed(3)}`
    if (seenByName.has(nameKey)) { stops[seenByName.get(nameKey)!].agendaIndices.push(idx); return }
    if (seenByCoord.has(coordKey)) {
      const si = seenByCoord.get(coordKey)!
      stops[si].agendaIndices.push(idx)
      seenByName.set(nameKey, si)
      return
    }
    const si = stops.length
    seenByName.set(nameKey, si)
    seenByCoord.set(coordKey, si)
    stops.push({ lat, lng, label, stopNumber: si + 1, agendaIndices: [idx] })
  }

  itinerary.agenda.forEach((item, i) => {
    if (item.lat && item.lng && item.location_name) addOrMerge(item.lat, item.lng, item.location_name, i)
  })

  if (stops.length === 0 && itinerary.place_details?.lat && itinerary.place_details?.lng) {
    stops.push({
      lat: itinerary.place_details.lat, lng: itinerary.place_details.lng,
      label: itinerary.venue_name, stopNumber: 1,
      agendaIndices: itinerary.agenda.map((_, i) => i),
    })
  }
  return stops
}

function haversineM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000
  const dLat = (b.lat - a.lat) * Math.PI / 180
  const dLng = (b.lng - a.lng) * Math.PI / 180
  const sin2 = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(sin2), Math.sqrt(1 - sin2))
}

function fmtTime(offsetMin: number): string {
  const total = 19 * 60 + offsetMin
  const h = Math.floor(total / 60) % 24
  const m = total % 60
  return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`
}

function sleep(ms: number) { return new Promise<void>(r => setTimeout(r, ms)) }

// ══════════════════════════════════════════════════════════════════════════════
// TOUR OVERLAY
// ══════════════════════════════════════════════════════════════════════════════

function TourOverlay({
  itinerary,
  mapStops,
  onClose,
}: {
  itinerary: Itinerary
  mapStops: MapStop[]
  onClose: () => void
}) {
  const mapRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<any[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const directionsRendererRef = useRef<any>(null)

  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [cardVisible, setCardVisible] = useState(false)
  const [transitioning, setTransitioning] = useState(false)
  const [mapReady, setMapReady] = useState(false)

  const stepRef = useRef(0)
  const playingRef = useRef(true)
  const transitioningRef = useRef(false)
  const goToStepRef = useRef<(n: number) => Promise<void>>(() => Promise.resolve())

  const currentStopIdx = mapStops.findIndex(s => s.agendaIndices.includes(step))
  const currentStop = currentStopIdx >= 0 ? mapStops[currentStopIdx] : null
  const item = itinerary.agenda[step]
  const isLastStep = step >= itinerary.agenda.length - 1

  const updateMarkers = useCallback((activeStopIdx: number) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g = (window as any).google.maps
    markersRef.current.forEach((marker, i) => {
      const stop = mapStops[i]
      const isAct = i === activeStopIdx
      const svgStr = isAct ? pulsingMarkerSvg(stop.stopNumber) : markerSvg(stop.stopNumber, false)
      marker.setIcon({
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svgStr)}`,
        scaledSize: new g.Size(isAct ? 64 : 36, isAct ? 76 : 46),
        anchor: new g.Point(isAct ? 32 : 18, isAct ? 76 : 46),
      })
      marker.setZIndex(isAct ? 300 : 50)
    })
  }, [mapStops])

  const flyToStop = useCallback((stop: MapStop): Promise<void> => {
    return new Promise(resolve => {
      const map = mapInstanceRef.current
      if (!map) { resolve(); return }
      map.setZoom(12)
      setTimeout(() => {
        map.panTo({ lat: stop.lat, lng: stop.lng })
        setTimeout(() => { map.setZoom(16); setTimeout(resolve, 700) }, 950)
      }, 750)
    })
  }, [])

  const goToStep = useCallback(async (nextStep: number) => {
    if (transitioningRef.current) return
    const prevStopIdx = mapStops.findIndex(s => s.agendaIndices.includes(stepRef.current))
    const nextStopIdx = mapStops.findIndex(s => s.agendaIndices.includes(nextStep))
    setCardVisible(false)
    await sleep(350)
    if (nextStopIdx >= 0 && nextStopIdx !== prevStopIdx) {
      transitioningRef.current = true
      setTransitioning(true)
      updateMarkers(nextStopIdx)
      await flyToStop(mapStops[nextStopIdx])
      transitioningRef.current = false
      setTransitioning(false)
    } else if (nextStopIdx >= 0) {
      updateMarkers(nextStopIdx)
    }
    stepRef.current = nextStep
    setStep(nextStep)
    await sleep(80)
    setCardVisible(true)
  }, [mapStops, flyToStop, updateMarkers])

  useEffect(() => { goToStepRef.current = goToStep }, [goToStep])

  useEffect(() => {
    if (!playing || !mapReady || transitioning) return
    const t = setTimeout(async () => {
      if (!playingRef.current || transitioningRef.current) return
      if (stepRef.current >= itinerary.agenda.length - 1) { setPlaying(false); playingRef.current = false; return }
      await goToStepRef.current(stepRef.current + 1)
    }, STEP_HOLD_MS)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, playing, mapReady, transitioning])

  useEffect(() => {
    if (!mapRef.current || mapStops.length === 0) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g = (window as any).google.maps
    const map = new g.Map(mapRef.current, {
      center: { lat: mapStops[0].lat, lng: mapStops[0].lng },
      zoom: 16, disableDefaultUI: true, zoomControl: false,
      mapId: "planit_tour", gestureHandling: "greedy",
    })
    mapInstanceRef.current = map
    const bounds = new g.LatLngBounds()
    markersRef.current = mapStops.map((stop, i) => {
      const isAct = i === 0
      const svgStr = isAct ? pulsingMarkerSvg(stop.stopNumber) : markerSvg(stop.stopNumber, false)
      const marker = new g.Marker({
        position: { lat: stop.lat, lng: stop.lng }, map, title: stop.label,
        icon: {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svgStr)}`,
          scaledSize: new g.Size(isAct ? 64 : 36, isAct ? 76 : 46),
          anchor: new g.Point(isAct ? 32 : 18, isAct ? 76 : 46),
        },
        zIndex: isAct ? 300 : 50,
      })
      bounds.extend({ lat: stop.lat, lng: stop.lng })
      marker.addListener("click", () => { playingRef.current = false; setPlaying(false); void goToStepRef.current(stop.agendaIndices[0]) })
      return marker
    })
    if (mapStops.length > 1) {
      let totalDist = 0
      for (let i = 1; i < mapStops.length; i++) totalDist += haversineM(mapStops[i - 1], mapStops[i])
      const avgLeg = totalDist / (mapStops.length - 1)
      const travelMode = avgLeg < 1200 ? g.TravelMode.WALKING : g.TravelMode.DRIVING
      const dr = new g.DirectionsRenderer({
        suppressMarkers: true,
        polylineOptions: { strokeColor: travelMode === g.TravelMode.WALKING ? "#10B981" : "#FF6B00", strokeOpacity: 0.65, strokeWeight: 4 },
        map,
      })
      directionsRendererRef.current = dr
      new g.DirectionsService().route({
        origin: { lat: mapStops[0].lat, lng: mapStops[0].lng },
        destination: { lat: mapStops[mapStops.length - 1].lat, lng: mapStops[mapStops.length - 1].lng },
        waypoints: mapStops.slice(1, -1).map(s => ({ location: new g.LatLng(s.lat, s.lng), stopover: true })),
        travelMode, optimizeWaypoints: false,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }, (result: any, status: any) => {
        if (status === "OK" && result) {
          dr.setDirections(result)
          const rb = result.routes[0]?.bounds
          if (rb) map.fitBounds(rb, { top: 80, right: 80, bottom: 240, left: 80 })
        }
      })
    }
    setMapReady(true)
    setTimeout(() => setCardVisible(true), 500)
    return () => { markersRef.current.forEach(m => m.setMap(null)); if (directionsRendererRef.current) directionsRendererRef.current.setMap(null) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handlePlayPause = async () => {
    if (isLastStep && !playing) { stepRef.current = 0; setStep(0); playingRef.current = true; setPlaying(true); await goToStep(0) }
    else { const next = !playing; playingRef.current = next; setPlaying(next) }
  }
  const handlePrev = async () => { if (step > 0 && !transitioning) { playingRef.current = false; setPlaying(false); await goToStep(step - 1) } }
  const handleNext = async () => { if (!isLastStep && !transitioning) { playingRef.current = false; setPlaying(false); await goToStep(step + 1) } }

  return (
    <div className="fixed inset-0 z-[9999] bg-black" style={{ touchAction: "none", overflow: "hidden", height: "100dvh" }}>
      <div ref={mapRef} className="absolute inset-0" style={{ width: "100%", height: "100%" }} />

      <div
        className="absolute inset-x-0 top-0 z-10 flex items-start gap-2 pointer-events-none"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 20px) + 8px)", paddingLeft: 12, paddingRight: 12, paddingBottom: 36, background: "linear-gradient(to bottom, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.2) 70%, transparent 100%)" }}
      >
        <button onClick={onClose} className="pointer-events-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white backdrop-blur-xl">
          <X className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-white" style={{ textShadow: "0 1px 4px rgba(0,0,0,.6)" }}>{itinerary.title}</p>
          {mapStops.length > 1 && (
            <div className="mt-1.5 flex items-center gap-1">
              {mapStops.map((_, i) => (
                <div key={i} className="rounded-full transition-all" style={{ height: 4, width: i === currentStopIdx ? 22 : 4, background: i === currentStopIdx ? "white" : i < currentStopIdx ? "rgba(255,255,255,0.65)" : "rgba(255,255,255,0.25)", transition: "width 0.35s cubic-bezier(0.2,0,0,1), background 0.3s ease" }} />
              ))}
            </div>
          )}
        </div>
        <div className="rounded-full border border-white/15 bg-black/45 px-2.5 py-1 backdrop-blur-xl">
          <span className="text-[11px] font-medium text-white/90">{step + 1}/{itinerary.agenda.length}</span>
        </div>
      </div>

      <div className="absolute inset-0 z-[8] flex items-center justify-center pointer-events-none transition-opacity duration-300" style={{ opacity: transitioning ? 1 : 0 }}>
        <div className="flex items-center gap-2.5 rounded-full border border-white/15 bg-black/55 px-5 py-2.5 backdrop-blur-lg">
          <Navigation className="h-4 w-4 text-white" />
          <span className="text-sm font-medium text-white">Heading to {currentStop?.label ?? "next stop"}…</span>
        </div>
      </div>

      <div
        className="absolute inset-x-0 bottom-0 z-10"
        style={{ padding: "40px 12px calc(env(safe-area-inset-bottom, 0px) + 12px)", background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.3) 60%, transparent 100%)", transform: cardVisible ? "translateY(0)" : "translateY(24px)", opacity: cardVisible ? 1 : 0, transition: "transform 0.45s cubic-bezier(0.2,0,0,1), opacity 0.35s ease" }}
      >
        <div className="overflow-hidden rounded-2xl bg-white shadow-[0_8px_30px_rgba(0,0,0,0.35)]">
          <div className="h-[2px] overflow-hidden bg-[#F5F5F5]">
            {playing && !transitioning && (
              <div key={`${step}-prog`} className="h-full bg-[#FF6B00]" style={{ animation: `tourProgress ${STEP_HOLD_MS}ms linear forwards` }} />
            )}
          </div>
          <div className="px-4 pb-3 pt-3">
            <div className="mb-2 flex items-center gap-2">
              {currentStop && (
                <div className="flex items-center gap-1 rounded-3xl bg-[#FFF2E8] py-0.5 pl-1 pr-2.5">
                  <div className="flex h-4 w-4 items-center justify-center rounded-full bg-[#FF6B00] text-[8px] font-bold text-white">{currentStop.stopNumber}</div>
                  <span className="text-[11px] font-semibold text-[#FF6B00]">{currentStop.label}</span>
                </div>
              )}
              <span className="ml-auto flex items-center gap-1 text-xs font-medium text-[#888]">
                <Clock className="h-3 w-3" />{fmtTime(item?.time_offset_min ?? 0)}
              </span>
            </div>
            <p className="mb-3 text-[13px] leading-snug text-black" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{item?.activity}</p>
            <div className="flex items-center gap-1.5">
              <button onClick={() => void handlePrev()} disabled={step === 0 || transitioning} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F5F5F5] text-[#888] transition-opacity disabled:opacity-30"><SkipBack className="h-4 w-4" /></button>
              <button onClick={() => void handlePlayPause()} className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full bg-black text-[13px] font-semibold text-white shadow-lg transition-all">
                {transitioning ? <Loader2 className="h-4 w-4" style={{ animation: "spin 1s linear infinite" }} /> : playing ? <Pause className="h-4 w-4" /> : isLastStep ? <RotateCcw className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {transitioning ? "Traveling…" : playing ? "Pause" : isLastStep ? "Replay" : "Resume"}
              </button>
              <button onClick={() => void handleNext()} disabled={isLastStep || transitioning} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F5F5F5] text-[#888] transition-opacity disabled:opacity-30"><SkipForward className="h-4 w-4" /></button>
            </div>
          </div>
        </div>
      </div>
      <style>{`@keyframes tourProgress { from { width: 0% } to { width: 100% } }`}</style>
    </div>
  )
}

// ── Stop transition divider ───────────────────────────────────────────────────

function StopTransition({ stop, travelMin }: { stop: MapStop; travelMin?: number }) {
  const travelLabel = travelMin
    ? travelMin < 60 ? `${travelMin} min` : `${Math.floor(travelMin / 60)}h ${travelMin % 60}m`
    : null
  return (
    <div className="my-1">
      {travelLabel && (
        <div className="flex items-center gap-2 px-5 py-1.5">
          <div className="flex w-7 shrink-0 justify-center"><div className="h-5 w-px bg-[#F5F5F5]" /></div>
          <span className="inline-flex items-center gap-1.5 rounded-3xl bg-[#F5F5F5] px-2.5 py-1 text-[11px] font-medium text-[#888]">
            <Footprints className="h-3 w-3" />{travelLabel} away
          </span>
        </div>
      )}
      <div className="flex items-center gap-2.5 bg-[#F5F5F5] px-5 py-2">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FF6B00] text-[11px] font-bold text-white">{stop.stopNumber}</div>
        <span className="text-sm font-bold text-black">{stop.label}</span>
      </div>
    </div>
  )
}

// ── Timeline stop card ────────────────────────────────────────────────────────

function StopCard({
  item, index, stopNumber, isActive, isMultiStop, onClick,
}: {
  item: AgendaItem; index: number; stopNumber?: number
  isActive: boolean; isMultiStop: boolean; onClick: () => void
}) {
  return (
    <button
      data-stop={index}
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-3 px-5 py-3 text-left transition-all",
        isActive ? "border-l-2 border-l-[#FF6B00] bg-white" : "border-l-2 border-l-transparent hover:bg-[#FAFAFA]"
      )}
    >
      <div className="mt-0.5 flex flex-col items-center">
        <div className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all",
          isActive ? "bg-[#FF6B00] text-white" : "bg-[#F5F5F5] text-[#888]"
        )}>
          {index + 1}
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-0.5 flex flex-wrap items-center gap-2">
          <span className={cn("text-xs font-semibold", isActive ? "text-[#FF6B00]" : "text-[#888]")}>{fmtTime(item.time_offset_min)}</span>
          {isMultiStop && stopNumber !== undefined && (
            <span className={cn("rounded-3xl px-1.5 py-0.5 text-[10px] font-semibold", isActive ? "bg-[#FFF2E8] text-[#FF6B00]" : "bg-[#F5F5F5] text-[#888]")}>Stop {stopNumber}</span>
          )}
        </div>
        <p className={cn("text-sm leading-relaxed", isActive ? "font-medium text-black" : "text-[#333]")}>{item.activity}</p>
        {isActive && item.location_name && (
          <div className="mt-1.5 flex items-center gap-1" style={{ animation: "fade-in 0.3s ease-out" }}>
            <MapPin className="h-3 w-3 text-[#FF6B00]" />
            <span className="text-xs font-medium text-[#FF6B00]">{item.location_name}</span>
          </div>
        )}
      </div>
    </button>
  )
}

// ── Stop Carousel Card ────────────────────────────────────────────────────────

function StopCarouselCard({ stop, item, isActive, onClick }: { stop: MapStop; item: AgendaItem; isActive: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-[140px] shrink-0 flex-col gap-1.5 rounded-2xl p-3 text-left transition-all",
        isActive ? "card-shadow bg-white ring-1 ring-[#FF6B00]/20" : "bg-[#F5F5F5]"
      )}
    >
      <div className={cn(
        "flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold",
        isActive ? "bg-[#FF6B00] text-white" : "bg-[#DDD] text-white"
      )}>
        {stop.stopNumber}
      </div>
      <p className="truncate text-[13px] font-bold text-black">{stop.label}</p>
      <p className="text-[11px] text-[#888]">{fmtTime(item.time_offset_min)}</p>
      <p className="line-clamp-1 text-[11px] text-[#333]">{item.activity}</p>
    </button>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export function ItineraryExplorer({ itinerary }: { itinerary: Itinerary }) {
  const [activeStop, setActiveStop] = useState(0)
  const [mapReady, setMapReady] = useState(false)
  const [mapFailed, setMapFailed] = useState(false)
  const [tourOpen, setTourOpen] = useState(false)

  const mapRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<any[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const directionsRendererRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const infoWindowRef = useRef<any>(null)
  const timelineRef = useRef<HTMLDivElement>(null)
  const carouselRef = useRef<HTMLDivElement>(null)

  const mapStops = buildMapStops(itinerary)
  const isMultiStop = mapStops.length > 1
  const photo = itinerary.place_details?.photo_url
  const rating = itinerary.place_details?.rating
  const reviews = itinerary.place_details?.user_rating_count

  useEffect(() => {
    if (!MAPS_KEY) return
    loadMapsApi()
      .then(() => {
        setMapReady(true)
      })
      .catch((err) => { console.warn("[ItineraryExplorer] Maps failed:", err?.message); setMapFailed(true) })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!mapReady || mapFailed || !mapRef.current || mapStops.length === 0) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g = (window as any).google?.maps
    if (!g?.Map) return
    const map = new g.Map(mapRef.current, {
      center: { lat: mapStops[0].lat, lng: mapStops[0].lng },
      zoom: isMultiStop ? 13 : 16,
      disableDefaultUI: true, zoomControl: false, mapId: "planit_map",
    })
    mapInstanceRef.current = map
    infoWindowRef.current = new g.InfoWindow()
    const bounds = new g.LatLngBounds()
    markersRef.current = mapStops.map((stop, i) => {
      const isAct = i === 0
      const marker = new g.Marker({
        position: { lat: stop.lat, lng: stop.lng }, map, title: stop.label,
        icon: {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(markerSvg(stop.stopNumber, isAct))}`,
          scaledSize: new g.Size(isAct ? 46 : 36, isAct ? 56 : 46),
          anchor: new g.Point(isAct ? 23 : 18, isAct ? 56 : 46),
        },
        zIndex: isAct ? 200 : 50,
      })
      bounds.extend({ lat: stop.lat, lng: stop.lng })
      marker.addListener("click", () => { setActiveStop(stop.agendaIndices[0] ?? 0) })
      return marker
    })
    if (isMultiStop) {
      let totalDist = 0
      for (let i = 1; i < mapStops.length; i++) totalDist += haversineM(mapStops[i - 1], mapStops[i])
      const avgLeg = totalDist / (mapStops.length - 1)
      const travelMode = avgLeg < 1200 ? g.TravelMode.WALKING : g.TravelMode.DRIVING
      const dr = new g.DirectionsRenderer({
        suppressMarkers: true,
        polylineOptions: { strokeColor: travelMode === g.TravelMode.WALKING ? "#10B981" : "#FF6B00", strokeOpacity: 0.8, strokeWeight: 4 },
        map,
      })
      directionsRendererRef.current = dr
      new g.DirectionsService().route({
        origin: { lat: mapStops[0].lat, lng: mapStops[0].lng },
        destination: { lat: mapStops[mapStops.length - 1].lat, lng: mapStops[mapStops.length - 1].lng },
        waypoints: mapStops.slice(1, -1).map(s => ({ location: new g.LatLng(s.lat, s.lng), stopover: true })),
        travelMode, optimizeWaypoints: false,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }, (result: any, status: any) => {
        if (status === "OK" && result) {
          dr.setDirections(result)
          const rb = result.routes[0]?.bounds
          if (rb) map.fitBounds(rb, { top: 40, right: 40, bottom: 40, left: 40 })
        } else {
          new g.Polyline({
            path: mapStops.map(s => ({ lat: s.lat, lng: s.lng })),
            strokeColor: "#FF6B00", strokeOpacity: 0.6, strokeWeight: 3, geodesic: true, map,
          })
          map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 })
        }
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady])

  useEffect(() => {
    if (!mapInstanceRef.current || markersRef.current.length === 0) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g = (window as any).google.maps
    const activeStopIdx = mapStops.findIndex(s => s.agendaIndices.includes(activeStop))
    if (activeStopIdx < 0) return
    markersRef.current.forEach((marker, i) => {
      const stop = mapStops[i]
      const isAct = i === activeStopIdx
      marker.setIcon({
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(markerSvg(stop.stopNumber, isAct))}`,
        scaledSize: new g.Size(isAct ? 46 : 36, isAct ? 56 : 46),
        anchor: new g.Point(isAct ? 23 : 18, isAct ? 56 : 46),
      })
      marker.setZIndex(isAct ? 200 : 50)
    })
    mapInstanceRef.current.panTo({ lat: mapStops[activeStopIdx].lat, lng: mapStops[activeStopIdx].lng })
  }, [activeStop, mapStops])

  useEffect(() => {
    timelineRef.current?.querySelector(`[data-stop="${activeStop}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest" })
  }, [activeStop])

  const stopForItem = (idx: number) => mapStops.find(s => s.agendaIndices.includes(idx))
  const prev = () => setActiveStop(s => Math.max(0, s - 1))
  const next = () => setActiveStop(s => Math.min(itinerary.agenda.length - 1, s + 1))

  return (
    <>
      {tourOpen && mapReady && mapStops.length > 0 && (
        <TourOverlay itinerary={itinerary} mapStops={mapStops} onClose={() => setTourOpen(false)} />
      )}

      <div className="flex w-full min-w-0 flex-col overflow-hidden">
        {/* ── Photo / Header ────────────────────────────────────────── */}
        <div className="relative shrink-0">
          {photo && (
            <div className="relative h-36 overflow-hidden rounded-2xl bg-[#F5F5F5]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo} alt={itinerary.venue_name} className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
            </div>
          )}
          {!photo && (
            <div className="mb-1 flex items-center gap-2">
              <span className="rounded-3xl bg-[#FF6B00] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">Itinerary</span>
              <span className="text-[11px] text-[#888]">
                {isMultiStop ? `${mapStops.length} stops · ` : ""}{itinerary.agenda.length} steps
              </span>
            </div>
          )}
          {photo && (
            <div className="absolute inset-x-0 bottom-0 px-5 pb-4">
              <div className="mb-1 flex items-center gap-2">
                <span className="rounded-3xl bg-[#FF6B00] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">Itinerary</span>
                <span className="text-[11px] text-white/80">
                  {isMultiStop ? `${mapStops.length} stops · ` : ""}{itinerary.agenda.length} steps
                </span>
              </div>
              <h3 className="text-xl font-bold text-white">{itinerary.title}</h3>
            </div>
          )}
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-3 py-3">
          <span className="flex items-center gap-1 text-xs text-[#333]"><MapPin className="h-3 w-3 text-[#888]" />{itinerary.venue_name}</span>
          {rating && (
            <span className="flex items-center gap-1 text-xs text-[#333]"><Star className="h-3 w-3 fill-amber-400 text-amber-400" />{rating}{reviews && ` (${reviews.toLocaleString()})`}</span>
          )}
          <span className="flex items-center gap-1 text-xs text-[#333]"><CreditCard className="h-3 w-3 text-[#888]" />{itinerary.cost_per_person}</span>
          <a href={itinerary.venue_maps_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs font-medium text-[#FF6B00]">
            <ExternalLink className="h-3 w-3" />Maps
          </a>
        </div>

        {/* Description */}
        <p className="mb-4 text-sm text-[#333]">{itinerary.description}</p>

        {/* ── Map (compact, full-bleed) ───────────────────────────────── */}
        <div className="relative -mx-4 h-[200px] overflow-hidden rounded-2xl bg-[#F5F5F5]">
          {MAPS_KEY && !mapFailed ? (
            <>
              <div ref={mapRef} className="absolute inset-0" />
              {!mapReady && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#F5F5F5]">
                  <Loader2 className="h-6 w-6 text-[#FF6B00]" style={{ animation: "spin 1s linear infinite" }} />
                  <p className="text-xs font-medium text-[#888]">Loading map…</p>
                </div>
              )}
              {mapReady && isMultiStop && (
                <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-1.5 rounded-3xl bg-white/95 px-3 py-1.5 shadow-sm">
                  <Route className="h-3.5 w-3.5 text-[#FF6B00]" />
                  <span className="text-[11px] font-semibold text-black">{mapStops.length} stops</span>
                </div>
              )}
              {mapReady && mapStops.length > 0 && (
                <button
                  onClick={() => setTourOpen(true)}
                  className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-xl bg-black/70 px-3 py-1.5 text-[11px] font-semibold text-white backdrop-blur-sm transition-colors hover:bg-black/80"
                >
                  <Maximize2 className="h-3 w-3" /> Expand
                </button>
              )}
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-[#888]">
              <MapIcon className="h-8 w-8" />
              <p className="px-6 text-center text-xs">
                {mapFailed ? "Map unavailable — invalid API key" : "Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to enable the map"}
              </p>
              {mapStops.length > 0 && (
                <div className="mt-1 flex flex-col items-center gap-1">
                  {mapStops.map((stop) => (
                    <a key={stop.stopNumber} href={`https://www.google.com/maps/search/?api=1&query=${stop.lat},${stop.lng}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-[#FF6B00] hover:underline">
                      <MapPin className="h-3 w-3" />{stop.stopNumber}. {stop.label}
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Stop Carousel ───────────────────────────────────────────── */}
        {mapStops.length > 0 && (
          <div ref={carouselRef} className="-mx-4 flex gap-2 overflow-x-auto px-4 py-3" style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}>
            {mapStops.map((stop) => {
              const firstIdx = stop.agendaIndices[0]
              const firstItem = itinerary.agenda[firstIdx]
              return (
                <StopCarouselCard
                  key={stop.stopNumber}
                  stop={stop}
                  item={firstItem}
                  isActive={stop.agendaIndices.includes(activeStop)}
                  onClick={() => setActiveStop(firstIdx)}
                />
              )
            })}
          </div>
        )}

        {/* ── Timeline ────────────────────────────────────────────────── */}
        <div ref={timelineRef} className="flex flex-col">
          <div className="flex items-center justify-between py-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#888]">Itinerary</p>
            <span className="text-xs text-[#888]">{itinerary.agenda.length} steps</span>
          </div>

          {isMultiStop && mapStops[0] && (
            <div className="flex items-center gap-2.5 bg-[#F5F5F5] px-5 py-2 rounded-t-2xl">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FF6B00] text-[11px] font-bold text-white">1</div>
              <span className="text-sm font-bold text-black">{mapStops[0].label}</span>
            </div>
          )}

          <div className="card-shadow overflow-hidden rounded-2xl bg-white">
            {itinerary.agenda.map((item, i) => {
              const stop = stopForItem(i)
              const isFirstOfNewStop = stop && i === stop.agendaIndices[0] && stop.stopNumber > 1
              return (
                <div key={i}>
                  {isFirstOfNewStop && <StopTransition stop={stop} travelMin={item.travel_time_min} />}
                  <StopCard
                    item={item} index={i} stopNumber={stop?.stopNumber}
                    isActive={activeStop === i} isMultiStop={isMultiStop}
                    onClick={() => setActiveStop(i)}
                  />
                </div>
              )
            })}
          </div>

          {/* Prev / Next */}
          <div className="flex items-center justify-between py-3">
            <button onClick={prev} disabled={activeStop === 0} className="flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold text-[#888] transition-colors hover:bg-[#F5F5F5] disabled:opacity-30">
              <ArrowLeft className="h-3.5 w-3.5" /> Prev
            </button>
            <span className="text-xs font-medium text-[#888]">{activeStop + 1} / {itinerary.agenda.length}</span>
            <button onClick={next} disabled={activeStop === itinerary.agenda.length - 1} className="flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold text-[#888] transition-colors hover:bg-[#F5F5F5] disabled:opacity-30">
              Next <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* ── Footer ──────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-[#F5F5F5] px-4 py-3">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-[#888]" />
            <p className="text-xs text-[#333]">
              {new Date(itinerary.suggested_date_range.start).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
              {" – "}
              {new Date(itinerary.suggested_date_range.end).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </p>
          </div>
          <a href={itinerary.venue_maps_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs font-semibold text-[#FF6B00]">
            <ExternalLink className="h-3.5 w-3.5" /> Google Maps
          </a>
        </div>
      </div>
    </>
  )
}
