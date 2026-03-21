"use client"

import { useEffect, useRef, useState } from "react"
import type { Itinerary, AgendaItem } from "@/lib/schemas"

// ── Types ──────────────────────────────────────────────────────────────────────

interface MapStop {
  lat: number
  lng: number
  label: string
  stopNumber: number
  agendaIndices: number[]
}

// ── Constants ──────────────────────────────────────────────────────────────────

const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

// ── Google Maps loader ────────────────────────────────────────────────────────

function loadMapsApi(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") { reject(); return }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).google?.maps) { resolve(); return }
    const id = "gmaps-vs"
    if (document.getElementById(id)) {
      const wait = setInterval(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((window as any).google?.maps) { clearInterval(wait); resolve() }
      }, 100)
      return
    }
    const s = document.createElement("script")
    s.id = id
    s.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&libraries=places`
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error("Maps failed to load"))
    document.head.appendChild(s)
  })
}

// ── M3 marker SVG ─────────────────────────────────────────────────────────────

function markerSvg(num: number, active: boolean): string {
  const r = active ? 20 : 15
  const s = r * 2 + 6
  const bg = active ? "#0b57d0" : "#1a73e8"
  const textSize = Math.round(r * 0.8)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s + 10}" viewBox="0 0 ${s} ${s + 10}">
    <circle cx="${s/2}" cy="${r+3}" r="${r}" fill="${bg}" stroke="white" stroke-width="2.5"/>
    <text x="${s/2}" y="${r+3+textSize*0.38}" text-anchor="middle" dominant-baseline="middle" fill="white" font-family="Roboto,Google Sans,Arial,sans-serif" font-size="${textSize}" font-weight="700">${num}</text>
    <path d="M${s/2-6} ${s-1} L${s/2} ${s+9} L${s/2+6} ${s-1}" fill="${bg}"/>
  </svg>`
}

// ── Build map stops from itinerary ────────────────────────────────────────────
// Dedup first by location_name (exact string), then by lat/lng proximity.
// This prevents duplicate markers when the same venue appears across multiple
// agenda steps with slightly different geocoded coordinates.

function buildMapStops(itinerary: Itinerary): MapStop[] {
  const stops: MapStop[] = []
  // Primary key: normalized location_name; Secondary key: "lat4,lng4"
  const seenByName = new Map<string, number>()
  const seenByCoord = new Map<string, number>()

  const addOrMerge = (lat: number, lng: number, label: string, idx: number) => {
    const nameKey = label.toLowerCase().trim()
    const coordKey = `${lat.toFixed(3)},${lng.toFixed(3)}` // ~110m tolerance

    // If we've seen this venue name before, merge into that stop
    if (seenByName.has(nameKey)) {
      stops[seenByName.get(nameKey)!].agendaIndices.push(idx)
      return
    }
    // If we've seen coords close by, merge (catches venues with no name)
    if (seenByCoord.has(coordKey)) {
      const stopIdx = seenByCoord.get(coordKey)!
      stops[stopIdx].agendaIndices.push(idx)
      seenByName.set(nameKey, stopIdx)
      return
    }

    const stopIdx = stops.length
    seenByName.set(nameKey, stopIdx)
    seenByCoord.set(coordKey, stopIdx)
    stops.push({ lat, lng, label, stopNumber: stopIdx + 1, agendaIndices: [idx] })
  }

  itinerary.agenda.forEach((item, i) => {
    if (item.lat && item.lng && item.location_name) {
      addOrMerge(item.lat, item.lng, item.location_name, i)
    }
  })

  // Fallback: single-stop plan using the main venue
  if (stops.length === 0 && itinerary.place_details?.lat && itinerary.place_details?.lng) {
    stops.push({
      lat: itinerary.place_details.lat,
      lng: itinerary.place_details.lng,
      label: itinerary.venue_name,
      stopNumber: 1,
      agendaIndices: itinerary.agenda.map((_, i) => i),
    })
  }

  return stops
}

// ── Haversine distance (meters) between two lat/lng points ───────────────────
function haversineM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000
  const dLat = (b.lat - a.lat) * Math.PI / 180
  const dLng = (b.lng - a.lng) * Math.PI / 180
  const sin2 = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(sin2), Math.sqrt(1 - sin2))
}

// ── Time formatter ────────────────────────────────────────────────────────────

function fmtTime(offsetMin: number): string {
  const total = 19 * 60 + offsetMin
  const h = Math.floor(total / 60) % 24
  const m = total % 60
  return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`
}

// ── Stop transition divider ───────────────────────────────────────────────────

function StopTransition({ stop, travelMin }: { stop: MapStop; travelMin?: number }) {
  const travelLabel = travelMin
    ? travelMin < 60
      ? `${travelMin} min`
      : `${Math.floor(travelMin / 60)}h ${travelMin % 60}m`
    : null

  return (
    <div style={{ margin: "4px 0" }}>
      {/* Travel time row */}
      {travelLabel && (
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 16px 6px 16px",
        }}>
          <div style={{ width: 28, display: "flex", justifyContent: "center", flexShrink: 0 }}>
            <div style={{ width: 1, height: 20, background: "var(--md-outline-variant)" }} />
          </div>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "3px 10px",
            borderRadius: "var(--md-shape-full)",
            background: "var(--md-secondary-container)",
            color: "var(--md-on-secondary-container)",
          }}>
            <span className="material-symbols-rounded" style={{ fontSize: 13 }}>directions_walk</span>
            <span className="md-label-sm">{travelLabel} away</span>
          </div>
        </div>
      )}
      {/* New stop header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 16px 4px",
        background: "var(--md-container-low)",
        borderTop: "1px solid var(--md-outline-variant)",
        borderBottom: "1px solid var(--md-outline-variant)",
      }}>
        <div style={{
          width: 22,
          height: 22,
          borderRadius: "var(--md-shape-full)",
          background: "var(--md-primary)",
          color: "var(--md-on-primary)",
          display: "flex", alignItems: "center", justifyContent: "center",
          font: "700 11px/1 Roboto",
          flexShrink: 0,
        }}>
          {stop.stopNumber}
        </div>
        <span className="md-label-lg" style={{ color: "var(--md-on-surface)", fontWeight: 600 }}>
          {stop.label}
        </span>
      </div>
    </div>
  )
}

// ── Stop card ─────────────────────────────────────────────────────────────────

function StopCard({
  item, index, stopNumber, isActive, isMultiStop, onClick,
}: {
  item: AgendaItem
  index: number
  stopNumber?: number
  isActive: boolean
  isMultiStop: boolean
  onClick: () => void
}) {
  return (
    <button
      data-stop={index}
      onClick={onClick}
      className="md-state"
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        padding: "12px 16px",
        width: "100%",
        textAlign: "left",
        border: "none",
        background: isActive ? "var(--md-primary-container)" : "transparent",
        borderLeft: `3px solid ${isActive ? "var(--md-primary)" : "transparent"}`,
        cursor: "pointer",
        transition: "background var(--md-dur-short) var(--md-easing-standard), border-color var(--md-dur-short) var(--md-easing-standard)",
        color: "var(--md-on-surface)",
      }}
    >
      {/* Step circle */}
      <div style={{
        width: 28,
        height: 28,
        borderRadius: "var(--md-shape-full)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        marginTop: 2,
        background: isActive ? "var(--md-primary)" : "var(--md-container)",
        color: isActive ? "var(--md-on-primary)" : "var(--md-on-surface-variant)",
        font: "700 12px/1 Roboto",
        transition: "background var(--md-dur-short) var(--md-easing-standard), transform var(--md-dur-short) var(--md-easing-emphasized)",
        transform: isActive ? "scale(1.15)" : "scale(1)",
        boxShadow: isActive ? "0 1px 3px rgba(0,0,0,.2)" : "none",
      }}>
        {index + 1}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Time + stop badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
          <span className="md-label-lg" style={{ color: isActive ? "var(--md-primary)" : "var(--md-on-surface-variant)" }}>
            {fmtTime(item.time_offset_min)}
          </span>
          {isMultiStop && stopNumber !== undefined && (
            <div className="md-chip md-chip--assist" style={{
              height: 20,
              padding: "0 8px",
              background: isActive ? "var(--md-primary)" : "var(--md-container-high)",
              color: isActive ? "var(--md-on-primary)" : "var(--md-on-surface-variant)",
              borderColor: "transparent",
              fontSize: 11,
              gap: 4,
            }}>
              Stop {stopNumber}
            </div>
          )}
        </div>

        {/* Activity */}
        <p className="md-body-md" style={{
          color: isActive ? "var(--md-on-primary-container)" : "var(--md-on-surface)",
          fontWeight: isActive ? 500 : 400,
          lineHeight: "1.4",
        }}>
          {item.activity}
        </p>

        {/* Location chip */}
        {item.location_name && (
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 6 }}>
            <span className="material-symbols-rounded" style={{ fontSize: 13, color: isActive ? "var(--md-primary)" : "var(--md-on-surface-variant)" }}>location_on</span>
            <span className="md-body-sm" style={{ color: isActive ? "var(--md-on-primary-container)" : "var(--md-on-surface-variant)" }}>
              {item.location_name}
            </span>
          </div>
        )}
      </div>
    </button>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function ItineraryExplorer({ itinerary }: { itinerary: Itinerary }) {
  const [activeStop, setActiveStop] = useState(0)
  const [mapReady, setMapReady] = useState(false)

  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<google.maps.Marker[]>([])
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null)
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null)
  const timelineRef = useRef<HTMLDivElement>(null)

  const mapStops = buildMapStops(itinerary)
  const isMultiStop = mapStops.length > 1
  const photo = itinerary.place_details?.photo_url
  const rating = itinerary.place_details?.rating
  const reviews = itinerary.place_details?.user_rating_count

  // Load Maps API
  useEffect(() => {
    if (!MAPS_KEY) return
    loadMapsApi().then(() => setMapReady(true)).catch(() => {/* no key */})
  }, [])

  // Init map
  useEffect(() => {
    if (!mapReady || !mapRef.current || mapStops.length === 0) return

    const map = new window.google.maps.Map(mapRef.current, {
      center: { lat: mapStops[0].lat, lng: mapStops[0].lng },
      zoom: isMultiStop ? 13 : 16,
      disableDefaultUI: true,
      zoomControl: true,
      fullscreenControl: true,
      mapId: "vibesync_map",
    })

    mapInstanceRef.current = map
    infoWindowRef.current = new window.google.maps.InfoWindow()

    const bounds = new window.google.maps.LatLngBounds()

    // Place numbered markers
    markersRef.current = mapStops.map((stop, i) => {
      const isAct = i === 0
      const icon = {
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(markerSvg(stop.stopNumber, isAct))}`,
        scaledSize: new window.google.maps.Size(isAct ? 46 : 36, isAct ? 56 : 46),
        anchor: new window.google.maps.Point(isAct ? 23 : 18, isAct ? 56 : 46),
      }
      const marker = new window.google.maps.Marker({
        position: { lat: stop.lat, lng: stop.lng },
        map, title: stop.label, icon, zIndex: isAct ? 200 : 50,
      })
      bounds.extend({ lat: stop.lat, lng: stop.lng })
      marker.addListener("click", () => {
        setActiveStop(stop.agendaIndices[0] ?? 0)
        infoWindowRef.current?.setContent(
          `<div style="font:500 14px Roboto,sans-serif;padding:4px 2px;max-width:220px;color:#1a1c22">${stop.label}</div>`
        )
        infoWindowRef.current?.open(map, marker)
      })
      return marker
    })

    if (isMultiStop) {
      // Pick travel mode: walking if all legs are short city distances, else driving
      let totalDist = 0
      for (let i = 1; i < mapStops.length; i++) totalDist += haversineM(mapStops[i - 1], mapStops[i])
      const avgLegDist = totalDist / (mapStops.length - 1)
      const travelMode = avgLegDist < 1200
        ? window.google.maps.TravelMode.WALKING
        : window.google.maps.TravelMode.DRIVING

      const directionsService = new window.google.maps.DirectionsService()
      const directionsRenderer = new window.google.maps.DirectionsRenderer({
        suppressMarkers: true,
        polylineOptions: {
          strokeColor: travelMode === window.google.maps.TravelMode.WALKING ? "#188038" : "#1a73e8",
          strokeOpacity: 0.8,
          strokeWeight: 4,
        },
        map,
      })
      directionsRendererRef.current = directionsRenderer

      const origin = { lat: mapStops[0].lat, lng: mapStops[0].lng }
      const destination = { lat: mapStops[mapStops.length - 1].lat, lng: mapStops[mapStops.length - 1].lng }
      const waypoints = mapStops.slice(1, -1).map(s => ({
        location: new window.google.maps.LatLng(s.lat, s.lng),
        stopover: true,
      }))

      directionsService.route({
        origin,
        destination,
        waypoints,
        travelMode,
        optimizeWaypoints: false,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }, (result: any, status: any) => {
        if (status === "OK" && result) {
          directionsRenderer.setDirections(result)
          // fitBounds from the directions result itself
          const routeBounds = result.routes[0]?.bounds
          if (routeBounds) map.fitBounds(routeBounds, { top: 64, right: 64, bottom: 80, left: 64 })
        } else {
          // Fallback straight-line polyline
          new window.google.maps.Polyline({
            path: mapStops.map(s => ({ lat: s.lat, lng: s.lng })),
            strokeColor: "#1a73e8",
            strokeOpacity: 0.6,
            strokeWeight: 3,
            geodesic: true,
            map,
          })
          map.fitBounds(bounds, { top: 64, right: 64, bottom: 80, left: 64 })
        }
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady])

  // Sync active stop → marker highlight + pan
  useEffect(() => {
    if (!mapInstanceRef.current || markersRef.current.length === 0) return

    const activeStopIdx = mapStops.findIndex(s => s.agendaIndices.includes(activeStop))
    if (activeStopIdx < 0) return

    markersRef.current.forEach((marker, i) => {
      const stop = mapStops[i]
      const isAct = i === activeStopIdx
      marker.setIcon({
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(markerSvg(stop.stopNumber, isAct))}`,
        scaledSize: new window.google.maps.Size(isAct ? 46 : 36, isAct ? 56 : 46),
        anchor: new window.google.maps.Point(isAct ? 23 : 18, isAct ? 56 : 46),
      })
      marker.setZIndex(isAct ? 200 : 50)
    })

    mapInstanceRef.current.panTo({ lat: mapStops[activeStopIdx].lat, lng: mapStops[activeStopIdx].lng })
  }, [activeStop, mapStops])

  // Scroll timeline to active
  useEffect(() => {
    timelineRef.current
      ?.querySelector(`[data-stop="${activeStop}"]`)
      ?.scrollIntoView({ behavior: "smooth", block: "nearest" })
  }, [activeStop])

  const stopForItem = (idx: number) => mapStops.find(s => s.agendaIndices.includes(idx))
  const prev = () => setActiveStop(s => Math.max(0, s - 1))
  const next = () => setActiveStop(s => Math.min(itinerary.agenda.length - 1, s + 1))

  return (
    <div className="md-card md-card-elevated" style={{ overflow: "hidden" }}>

      {/* ── Photo / Header ─────────────────────────────────────────────── */}
      <div style={{ position: "relative" }}>
        {photo && (
          <div style={{ height: 140, overflow: "hidden", background: "var(--md-container)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo} alt={itinerary.venue_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <div style={{
              position: "absolute", inset: 0, height: 140,
              background: "linear-gradient(to top, rgba(0,0,0,.65) 0%, rgba(0,0,0,.1) 60%, transparent 100%)",
            }} />
          </div>
        )}
        <div style={{
          padding: photo ? "0 16px 16px" : "16px",
          position: photo ? "absolute" : "static",
          bottom: 0, left: 0, right: 0,
        }}>
          <p className="md-headline-sm" style={{ color: photo ? "white" : "var(--md-on-surface)", marginBottom: 4 }}>
            {itinerary.title}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
            <span className="md-body-sm" style={{ color: photo ? "rgba(255,255,255,.85)" : "var(--md-on-surface-variant)", display: "flex", alignItems: "center", gap: 4 }}>
              <span className="material-symbols-rounded" style={{ fontSize: 14 }}>location_on</span>
              {itinerary.venue_name}
            </span>
            {rating && (
              <span className="md-body-sm" style={{ color: photo ? "rgba(255,255,255,.85)" : "var(--md-on-surface-variant)", display: "flex", alignItems: "center", gap: 4 }}>
                <span className="material-symbols-rounded" style={{ fontSize: 14, color: "#fbbc04" }}>star</span>
                {rating}{reviews && ` (${reviews.toLocaleString()})`}
              </span>
            )}
            <span className="md-body-sm" style={{ color: photo ? "rgba(255,255,255,.85)" : "var(--md-on-surface-variant)", display: "flex", alignItems: "center", gap: 4 }}>
              <span className="material-symbols-rounded" style={{ fontSize: 14 }}>payments</span>
              {itinerary.cost_per_person}
            </span>
            <a
              href={itinerary.venue_maps_url}
              target="_blank"
              rel="noopener noreferrer"
              className="md-body-sm"
              style={{ color: photo ? "rgba(147,201,255,1)" : "var(--md-primary)", display: "flex", alignItems: "center", gap: 4, textDecoration: "none" }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: 14 }}>open_in_new</span>
              Maps
            </a>
          </div>
        </div>
      </div>

      {/* Description */}
      <div style={{ padding: "12px 16px", background: "var(--md-container-low)", borderBottom: "1px solid var(--md-outline-variant)" }}>
        <p className="md-body-md" style={{ color: "var(--md-on-surface-variant)" }}>{itinerary.description}</p>
      </div>

      {/* ── Split: Timeline + Map ──────────────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column" }} className="md:flex-row md:h-[500px]">

        {/* Timeline */}
        <div
          ref={timelineRef}
          style={{
            width: "100%",
            borderBottom: "1px solid var(--md-outline-variant)",
            display: "flex",
            flexDirection: "column",
            background: "var(--md-surface)",
            overflow: "hidden",
          }}
          className="md:w-[42%] md:border-r md:border-b-0"
        >
          {/* Timeline header */}
          <div style={{
            padding: "10px 16px",
            borderBottom: "1px solid var(--md-outline-variant)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--md-container-low)",
            position: "sticky",
            top: 0,
            zIndex: 5,
          }}>
            <p className="md-label-lg" style={{ color: "var(--md-on-surface-variant)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Itinerary</p>
            <p className="md-label-md" style={{ color: "var(--md-on-surface-variant)" }}>
              {isMultiStop ? `${mapStops.length} locations · ` : ""}{itinerary.agenda.length} steps
            </p>
          </div>

          {/* Steps */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {/* First stop header */}
            {isMultiStop && mapStops[0] && (
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 16px 4px",
                background: "var(--md-container-low)",
                borderBottom: "1px solid var(--md-outline-variant)",
              }}>
                <div style={{
                  width: 22, height: 22, borderRadius: "var(--md-shape-full)",
                  background: "var(--md-primary)", color: "var(--md-on-primary)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  font: "700 11px/1 Roboto", flexShrink: 0,
                }}>1</div>
                <span className="md-label-lg" style={{ color: "var(--md-on-surface)", fontWeight: 600 }}>
                  {mapStops[0].label}
                </span>
              </div>
            )}

            {itinerary.agenda.map((item, i) => {
              const stop = stopForItem(i)
              const isFirstOfNewStop = stop && i === stop.agendaIndices[0] && stop.stopNumber > 1
              return (
                <div key={i}>
                  {isFirstOfNewStop && (
                    <StopTransition stop={stop} travelMin={item.travel_time_min} />
                  )}
                  <StopCard
                    item={item}
                    index={i}
                    stopNumber={stop?.stopNumber}
                    isActive={activeStop === i}
                    isMultiStop={isMultiStop}
                    onClick={() => setActiveStop(i)}
                  />
                </div>
              )
            })}
          </div>

          {/* Prev / Next */}
          <div style={{
            padding: "8px 12px",
            borderTop: "1px solid var(--md-outline-variant)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--md-container-low)",
          }}>
            <button
              onClick={prev}
              disabled={activeStop === 0}
              className="md-btn md-btn-text md-state"
              style={{ height: 36, padding: "0 12px", fontSize: 13, opacity: activeStop === 0 ? 0.38 : 1 }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: 18 }}>arrow_back</span>
              Prev
            </button>
            <span className="md-label-md" style={{ color: "var(--md-on-surface-variant)" }}>
              {activeStop + 1} / {itinerary.agenda.length}
            </span>
            <button
              onClick={next}
              disabled={activeStop === itinerary.agenda.length - 1}
              className="md-btn md-btn-text md-state"
              style={{ height: 36, padding: "0 12px", fontSize: 13, opacity: activeStop === itinerary.agenda.length - 1 ? 0.38 : 1 }}
            >
              Next
              <span className="material-symbols-rounded" style={{ fontSize: 18 }}>arrow_forward</span>
            </button>
          </div>
        </div>

        {/* Map */}
        <div style={{ flex: 1, minHeight: 300, background: "var(--md-container)", position: "relative" }}>
          {MAPS_KEY ? (
            <>
              <div ref={mapRef} style={{ position: "absolute", inset: 0 }} />

              {/* Loading overlay */}
              {!mapReady && (
                <div style={{
                  position: "absolute", inset: 0,
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  background: "var(--md-container)",
                  gap: 12,
                }}>
                  <div style={{
                    width: 40, height: 40,
                    border: "3px solid var(--md-primary-container)",
                    borderTopColor: "var(--md-primary)",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                  }} />
                  <p className="md-label-lg" style={{ color: "var(--md-on-surface-variant)" }}>Loading map…</p>
                </div>
              )}

              {/* Active step overlay card */}
              {mapReady && (
                <div style={{
                  position: "absolute",
                  bottom: 12,
                  left: 12,
                  right: 12,
                  background: "rgba(255,255,255,.97)",
                  backdropFilter: "blur(8px)",
                  borderRadius: "var(--md-shape-md)",
                  padding: "10px 14px",
                  boxShadow: "0 2px 8px rgba(0,0,0,.2)",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  pointerEvents: "none",
                }}>
                  <div style={{
                    width: 32, height: 32,
                    borderRadius: "var(--md-shape-full)",
                    background: "var(--md-primary)",
                    color: "var(--md-on-primary)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    font: "700 13px Roboto",
                    flexShrink: 0,
                  }}>
                    {activeStop + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="md-label-lg" style={{ color: "var(--md-on-surface)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {itinerary.agenda[activeStop]?.location_name || itinerary.venue_name}
                    </p>
                    <p className="md-body-sm" style={{ color: "var(--md-on-surface-variant)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 1 }}>
                      {fmtTime(itinerary.agenda[activeStop]?.time_offset_min ?? 0)}
                      {" · "}
                      {(itinerary.agenda[activeStop]?.activity ?? "").slice(0, 55)}
                      {(itinerary.agenda[activeStop]?.activity ?? "").length > 55 ? "…" : ""}
                    </p>
                  </div>
                </div>
              )}

              {/* Multi-stop badge */}
              {mapReady && isMultiStop && (
                <div style={{
                  position: "absolute",
                  top: 12, left: 12,
                  background: "rgba(255,255,255,.95)",
                  borderRadius: "var(--md-shape-full)",
                  padding: "6px 14px",
                  boxShadow: "0 1px 4px rgba(0,0,0,.2)",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  pointerEvents: "none",
                }}>
                  <span className="material-symbols-rounded" style={{ fontSize: 16, color: "var(--md-primary)" }}>route</span>
                  <span className="md-label-md" style={{ color: "var(--md-on-surface)" }}>{mapStops.length} stops</span>
                </div>
              )}
            </>
          ) : (
            <div style={{
              position: "absolute", inset: 0,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              gap: 8, color: "var(--md-on-surface-variant)",
            }}>
              <span className="material-symbols-rounded" style={{ fontSize: 40 }}>map</span>
              <p className="md-body-md" style={{ textAlign: "center", padding: "0 24px" }}>
                Set <code style={{ fontFamily: "monospace", background: "var(--md-container)", padding: "1px 4px", borderRadius: 4 }}>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to enable the map
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <div style={{
        padding: "10px 16px",
        borderTop: "1px solid var(--md-outline-variant)",
        background: "var(--md-container-low)",
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span className="material-symbols-rounded" style={{ fontSize: 16, color: "var(--md-on-surface-variant)" }}>calendar_month</span>
          <p className="md-body-sm" style={{ color: "var(--md-on-surface-variant)" }}>
            {new Date(itinerary.suggested_date_range.start).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
            {" – "}
            {new Date(itinerary.suggested_date_range.end).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </p>
        </div>
        <a
          href={itinerary.venue_maps_url}
          target="_blank"
          rel="noopener noreferrer"
          className="md-btn md-btn-text md-state"
          style={{ height: 32, padding: "0 8px", fontSize: 13, textDecoration: "none" }}
        >
          <span className="material-symbols-rounded" style={{ fontSize: 16 }}>open_in_new</span>
          Open in Google Maps
        </a>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
