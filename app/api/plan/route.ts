import { NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { z } from "zod"
import { VideoContextZodSchema } from "@/lib/zod-schemas"
import { v4 as uuidv4 } from "uuid"
import type { PlaceDetails, Itinerary, VideoContext } from "@/lib/schemas"

const PlanningOutputSchema = z.object({
  title: z.string(),
  description: z.string(),
  venue_name: z.string(),
  venue_address: z.string(),
  venue_maps_url: z.string(),
  cost_per_person: z.string(),
  duration_hrs: z.number(),
  suggested_date_range: z.object({
    start: z.string(),
    end: z.string(),
  }),
  agenda: z.array(
    z.object({
      time_offset_min: z.number(),
      activity: z.string(),
      location_name: z.string().optional(),
      lat: z.number().optional(),
      lng: z.number().optional(),
    })
  ),
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

    const geminiKey = process.env.GEMINI_API_KEY
    if (!geminiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 })
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

    const prompt = `Create a realistic multi-stop night-out itinerary visiting several distinct venues.

Video analysis from Gemini:
- Venue type: ${vc.venue_type}
- Vibe: ${vc.vibe}
- Category: ${vc.activity_category}
- Location: ${location}
- Price range: ${vc.price_range}
- Duration: ~${vc.duration_estimate_hrs} hours
${vc.key_details ? `- Key details from video: ${vc.key_details}` : ""}

${placeContext}

Guidelines:
- Plan a route through 3-5 DISTINCT real venues in ${location}
- Every venue must be a real, named, searchable place — use the exact business name
- Each agenda item at a new venue MUST have location_name set to that venue's full name
- Include specific details: what to order, where to sit, what to expect
- Account for travel time between stops
- Suggested date window: ${nextWeekend.toISOString()} to ${twoWeeksOut.toISOString()}

Return ONLY valid JSON matching this schema (no markdown fences, no extra text):
{
  "title": "Catchy event name",
  "description": "2-3 sentence description",
  "venue_name": "Primary venue name",
  "venue_address": "Full address",
  "venue_maps_url": "Google Maps URL",
  "cost_per_person": "$40-60/person",
  "duration_hrs": 4,
  "suggested_date_range": {
    "start": "ISO datetime",
    "end": "ISO datetime"
  },
  "agenda": [
    {
      "time_offset_min": 0,
      "activity": "Description of what happens",
      "location_name": "Venue Name (only for distinct physical locations)",
      "lat": 37.7749,
      "lng": -122.4194
    }
  ]
}

IMPORTANT: Every agenda item that has a location_name MUST also include accurate lat and lng coordinates for that real venue. Use the actual GPS coordinates of each named venue.`

    const genAI = new GoogleGenerativeAI(geminiKey)
    const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash"
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: "You are an expert local event planner. You create detailed, realistic multi-stop itineraries using real venue names and addresses. You always return valid JSON and nothing else — no markdown fences, no explanation text.",
    })

    let result
    const MAX_RETRIES = 3
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        result = await model.generateContent(prompt)
        break
      } catch (err: unknown) {
        const is503 = err instanceof Error && err.message.includes("503")
        if (!is503 || attempt === MAX_RETRIES - 1) throw err
        const delay = 1000 * 2 ** attempt
        console.log(`[plan] 503 from Gemini, retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`)
        await new Promise(r => setTimeout(r, delay))
      }
    }

    if (!result) throw new Error("Gemini request failed after retries")
    const rawText = result.response.text().trim()

    const jsonStr = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "")

    let planData
    try {
      planData = JSON.parse(jsonStr)
    } catch {
      return NextResponse.json(
        { error: "Gemini returned invalid JSON", raw: rawText },
        { status: 502 },
      )
    }

    const planValidated = PlanningOutputSchema.safeParse(planData)
    if (!planValidated.success) {
      return NextResponse.json(
        { error: "Gemini output doesn't match schema", details: planValidated.error.flatten(), raw: planData },
        { status: 502 },
      )
    }

    const plan = planValidated.data

    // Agenda already has lat/lng from Gemini; try to enhance with Google Places if available
    let geocodedAgenda = plan.agenda as (typeof plan.agenda[0] & { travel_time_min?: number })[]

    if (mapsKey) {
      const coordsCache = new Map<string, { lat: number; lng: number } | null>()

      if (placeDetails?.lat && placeDetails?.lng && placeDetails.name) {
        coordsCache.set(placeDetails.name.toLowerCase(), { lat: placeDetails.lat, lng: placeDetails.lng })
      }

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

      geocodedAgenda = plan.agenda.map(item => {
        if (!item.location_name) return item
        const googleCoords = coordsCache.get(item.location_name.toLowerCase())
        if (googleCoords) return { ...item, ...googleCoords }
        return item
      })
    }

    // Compute travel times between distinct stops that have coordinates
    const distinctStops = geocodedAgenda.reduce<Array<{ lat: number; lng: number; firstIdx: number }>>((acc, item, i) => {
      if (!item.lat || !item.lng) return acc
      const prev = acc[acc.length - 1]
      const isSameLocation = prev &&
        Math.abs(prev.lat - item.lat) < 0.0002 &&
        Math.abs(prev.lng - item.lng) < 0.0002
      if (!isSameLocation) acc.push({ lat: item.lat, lng: item.lng, firstIdx: i })
      return acc
    }, [])

    if (mapsKey && distinctStops.length >= 2) {
      const times = await getTravelTimes(distinctStops, mapsKey)
      distinctStops.slice(1).forEach((stop, i) => {
        if (times[i] !== undefined) {
          geocodedAgenda[stop.firstIdx] = { ...geocodedAgenda[stop.firstIdx], travel_time_min: times[i] }
        }
      })
    }

    console.log("[plan] agenda stops with coords:", geocodedAgenda.filter(a => a.lat && a.lng).length, "/", geocodedAgenda.length)

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
