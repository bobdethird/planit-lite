import { NextRequest, NextResponse } from "next/server"
import { generateObject } from "ai"
import { google } from "@ai-sdk/google"
import { z } from "zod"
import { VideoContextZodSchema } from "@/lib/zod-schemas"
import { v4 as uuidv4 } from "uuid"
import type { PlaceDetails, Itinerary, VideoContext } from "@/lib/schemas"

const PlanningOutputSchema = z.object({
  title: z.string().describe("Catchy event name, e.g. 'Rooftop Cocktail Night @ Charmaine's'"),
  description: z.string().describe("2-3 sentence description of the event vibe"),
  venue_name: z.string().describe("Specific venue name"),
  venue_address: z.string().describe("Full address"),
  venue_maps_url: z.string().describe("Google Maps URL for the venue"),
  cost_per_person: z.string().describe("Estimated cost e.g. '$40-60/person' or 'Free'"),
  duration_hrs: z.number().describe("Expected duration in hours"),
  suggested_date_range: z.object({
    start: z.string().describe("ISO datetime for earliest suggested start (next weekend evening)"),
    end: z.string().describe("ISO datetime for latest suggested end (2 weeks out)"),
  }),
  agenda: z.array(
    z.object({
      time_offset_min: z.number().describe("Minutes from event start"),
      activity: z.string().describe("Specific activity with context — not generic"),
      location_name: z.string().optional().describe(
        "The full, searchable name of the standalone venue or place for this stop (e.g. 'Sightglass Coffee', 'Dolores Park', 'The Interval Bar'). ONLY set this for physically distinct locations that a person travels to — never use room names, sections, or areas within the same building (e.g. do NOT use 'Rooftop terrace' or 'Main bar'). Omit for transition steps like 'walk to next stop' or 'head inside'."
      ),
    })
  ).describe("Multi-stop itinerary visiting 3-5 distinct real venues in the city; every venue stop must have a unique location_name that is a real, searchable place name"),
})

// ─── Google Maps Places API ───────────────────────────────────────────────────

async function searchPlace(query: string, mapsKey: string): Promise<PlaceDetails | null> {
  try {
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": mapsKey,
        "X-Goog-FieldMask": [
          "places.id",
          "places.displayName",
          "places.formattedAddress",
          "places.location",
          "places.regularOpeningHours",
          "places.rating",
          "places.userRatingCount",
          "places.priceLevel",
          "places.websiteUri",
          "places.googleMapsUri",
          "places.photos",
        ].join(","),
      },
      body: JSON.stringify({ textQuery: query, maxResultCount: 1, languageCode: "en" }),
    })

    if (!res.ok) return null
    const data = await res.json()
    const place = data.places?.[0]
    if (!place) return null

    let photo_url: string | undefined
    if (place.photos?.[0]?.name) {
      photo_url = `https://places.googleapis.com/v1/${place.photos[0].name}/media?maxWidthPx=800&key=${mapsKey}`
    }

    return {
      place_id: place.id ?? "",
      name: place.displayName?.text ?? "",
      formatted_address: place.formattedAddress ?? "",
      maps_url: place.googleMapsUri ?? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`,
      website: place.websiteUri,
      rating: place.rating,
      user_rating_count: place.userRatingCount,
      price_level: place.priceLevel,
      opening_hours: place.regularOpeningHours
        ? {
            open_now: place.regularOpeningHours.openNow,
            weekday_text: place.regularOpeningHours.weekdayDescriptions,
          }
        : undefined,
      photo_url,
      lat: place.location?.latitude,
      lng: place.location?.longitude,
    }
  } catch {
    return null
  }
}

// ─── Routes API — travel times between consecutive stops ──────────────────────

async function getTravelTimes(
  stops: Array<{ lat: number; lng: number }>,
  mapsKey: string
): Promise<number[]> {
  if (stops.length < 2) return []
  try {
    const body = {
      origin: { location: { latLng: { latitude: stops[0].lat, longitude: stops[0].lng } } },
      destination: { location: { latLng: { latitude: stops[stops.length - 1].lat, longitude: stops[stops.length - 1].lng } } },
      intermediates: stops.slice(1, -1).map(s => ({
        location: { latLng: { latitude: s.lat, longitude: s.lng } },
      })),
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_AWARE",
    }
    const res = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": mapsKey,
        "X-Goog-FieldMask": "routes.legs.duration,routes.legs.distanceMeters",
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) return []
    const data = await res.json()
    const legs = data.routes?.[0]?.legs ?? []
    return legs.map((leg: { duration?: string }) => {
      const secs = parseInt(leg.duration?.replace("s", "") ?? "0")
      return Math.max(1, Math.round(secs / 60))
    })
  } catch {
    return []
  }
}

async function geocodeLocation(
  query: string,
  mapsKey: string
): Promise<{ lat: number; lng: number } | null> {
  try {
    // Use Places Text Search — more accurate for venue names than Geocoding API
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": mapsKey,
        "X-Goog-FieldMask": "places.location",
      },
      body: JSON.stringify({ textQuery: query, maxResultCount: 1, languageCode: "en" }),
    })
    if (!res.ok) return null
    const data = await res.json()
    const loc = data.places?.[0]?.location
    if (!loc) return null
    return { lat: loc.latitude, lng: loc.longitude }
  } catch {
    return null
  }
}

function formatOpeningHours(place: PlaceDetails): string {
  if (!place.opening_hours?.weekday_text?.length) return ""
  return `Opening hours:\n${place.opening_hours.weekday_text.join("\n")}`
}

function priceLevelText(level?: number): string {
  if (level === undefined) return ""
  return ["Free", "Inexpensive", "Moderate", "Expensive", "Very Expensive"][level] ?? ""
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { videoContext } = body as { videoContext?: unknown }

    if (!videoContext) {
      return NextResponse.json({ error: "Missing videoContext" }, { status: 400 })
    }

    const parsed = VideoContextZodSchema.safeParse(videoContext)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid videoContext schema" }, { status: 400 })
    }

    const vc = parsed.data

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return NextResponse.json({ error: "GOOGLE_GENERATIVE_AI_API_KEY not configured" }, { status: 500 })
    }

    // Try Google Maps Places lookup
    const mapsKey = process.env.GOOGLE_MAPS_API_KEY
    const location = vc.location_hint || "San Francisco"
    let placeDetails: PlaceDetails | null = null

    if (mapsKey) {
      const searchQuery = `${vc.venue_type} ${location}`
      placeDetails = await searchPlace(searchQuery, mapsKey)
    }

    const now = new Date()
    const nextWeekend = new Date(now)
    nextWeekend.setDate(now.getDate() + ((6 - now.getDay() + 7) % 7 || 7))
    nextWeekend.setHours(19, 0, 0, 0)

    const twoWeeksOut = new Date(now)
    twoWeeksOut.setDate(now.getDate() + 14)
    twoWeeksOut.setHours(22, 0, 0, 0)

    const placeContext = placeDetails
      ? `
Real venue found via Google Maps:
- Name: ${placeDetails.name}
- Address: ${placeDetails.formatted_address}
- Rating: ${placeDetails.rating ?? "N/A"} (${placeDetails.user_rating_count ?? 0} reviews)
- Price level: ${priceLevelText(placeDetails.price_level)}
- Maps URL: ${placeDetails.maps_url}
${placeDetails.website ? `- Website: ${placeDetails.website}` : ""}
${formatOpeningHours(placeDetails)}

Use this REAL venue data. Build the agenda around the actual opening hours.`
      : `No Maps data available. Use your knowledge of ${location} venues.`

    const prompt = `You are a local expert event planner. Create a realistic multi-stop night-out itinerary visiting several distinct venues.

Video analysis:
- Venue type: ${vc.venue_type}
- Vibe: ${vc.vibe}
- Category: ${vc.activity_category}
- Location: ${location}
- Price range: ${vc.price_range}
- Duration: ~${vc.duration_estimate_hrs} hours
${vc.audio_transcript ? `- Audio context: "${vc.audio_transcript.slice(0, 400)}"` : ""}

${placeContext}

Guidelines:
- Plan a route through 3-5 DISTINCT real venues in ${location} (e.g. start at a bar, walk to a restaurant, end at a rooftop or club)
- Every venue must be a real, named, searchable place — use the exact business name so it can be found on Google Maps
- Each agenda item at a new venue MUST have location_name set to that venue's full name
- Include specific details: what to order, where to sit, what to expect at each stop
- Account for travel time, parking, waits in the timeline
- Suggest ideal arrival time based on venue type and hours
- Suggested date window: ${nextWeekend.toISOString()} to ${twoWeeksOut.toISOString()}`

    const { object: plan } = await generateObject({
      model: google("gemini-2.5-flash"),
      schema: PlanningOutputSchema,
      prompt,
    })

    // Geocode agenda stops (deduplicated by location_name)
    let geocodedAgenda = plan.agenda as (typeof plan.agenda[0] & { lat?: number; lng?: number; travel_time_min?: number })[]
    if (mapsKey) {
      // Build a map of location_name → coords
      const coordsCache = new Map<string, { lat: number; lng: number } | null>()

      // Pre-seed with main venue coords
      if (placeDetails?.lat && placeDetails?.lng && placeDetails.name) {
        coordsCache.set(placeDetails.name.toLowerCase(), { lat: placeDetails.lat, lng: placeDetails.lng })
      }

      // Collect unique location names to geocode
      const uniqueNames = [...new Set(
        plan.agenda
          .map(item => item.location_name)
          .filter((n): n is string => !!n && !coordsCache.has(n.toLowerCase()))
      )]

      await Promise.all(
        uniqueNames.map(async (name) => {
          const query = `${name}, ${vc.location_hint || "San Francisco"}`
          const coords = await geocodeLocation(query, mapsKey)
          coordsCache.set(name.toLowerCase(), coords)
        })
      )

      // Assign coords to each agenda item
      geocodedAgenda = plan.agenda.map(item => {
        if (!item.location_name) return item
        const coords = coordsCache.get(item.location_name.toLowerCase())
        return coords ? { ...item, ...coords } : item
      })

      // Get travel times between distinct consecutive stops via Routes API
      const distinctStops = geocodedAgenda.reduce<Array<{ lat: number; lng: number; firstIdx: number }>>((acc, item, i) => {
        if (!item.lat || !item.lng) return acc
        const prev = acc[acc.length - 1]
        const isSameLocation = prev &&
          Math.abs(prev.lat - item.lat) < 0.0002 &&
          Math.abs(prev.lng - item.lng) < 0.0002
        if (!isSameLocation) acc.push({ lat: item.lat, lng: item.lng, firstIdx: i })
        return acc
      }, [])

      if (distinctStops.length >= 2) {
        const times = await getTravelTimes(distinctStops, mapsKey)
        // Assign travel_time_min to the first item at each new stop (except the first stop)
        distinctStops.slice(1).forEach((stop, i) => {
          if (times[i] !== undefined) {
            geocodedAgenda[stop.firstIdx] = { ...geocodedAgenda[stop.firstIdx], travel_time_min: times[i] }
          }
        })
      }
    }

    // Override with real Maps data if available
    const itinerary: Itinerary = {
      ...plan,
      agenda: geocodedAgenda,
      id: uuidv4(),
      created_at: new Date().toISOString(),
      video_context: vc as VideoContext,
      ...(placeDetails && {
        venue_name: placeDetails.name || plan.venue_name,
        venue_address: placeDetails.formatted_address || plan.venue_address,
        venue_maps_url: placeDetails.maps_url,
        place_details: placeDetails,
      }),
    }

    return NextResponse.json({ itinerary })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Planning failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
