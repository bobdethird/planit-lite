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
    })
  ).describe("Realistic step-by-step agenda based on actual venue hours and travel context"),
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

    const prompt = `You are a local expert event planner. Create a realistic, contextual event itinerary.

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
- Make the agenda feel like a real plan from someone who's been there
- Include specific details: what to order, where to sit, what to expect
- Account for travel time, parking, waits in the timeline
- Suggest ideal arrival time based on venue type and hours
- Suggested date window: ${nextWeekend.toISOString()} to ${twoWeeksOut.toISOString()}`

    const { object: plan } = await generateObject({
      model: google("gemini-2.5-flash"),
      schema: PlanningOutputSchema,
      prompt,
    })

    // Override with real Maps data if available
    const itinerary: Itinerary = {
      ...plan,
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
