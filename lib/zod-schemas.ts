import { z } from "zod"

export const VideoContextZodSchema = z.object({
  venue_type: z.string(),
  vibe: z.string(),
  activity_category: z.enum(["food", "outdoors", "nightlife", "culture", "sports", "other"]),
  location_hint: z.string().optional(),
  price_range: z.enum(["free", "$", "$$", "$$$"]),
  duration_estimate_hrs: z.number(),
  audio_transcript: z.string().optional(),
})

export const ItineraryZodSchema = z.object({
  title: z.string().describe("Catchy event name"),
  description: z.string().describe("2-3 sentence description of the event vibe"),
  venue_name: z.string().describe("Specific venue name"),
  venue_address: z.string().describe("Full address or neighborhood"),
  venue_maps_url: z.string().describe("Google Maps search URL"),
  cost_per_person: z.string().describe("e.g. '$40-60/person' or 'Free'"),
  duration_hrs: z.number(),
  suggested_date_range: z.object({
    start: z.string().describe("ISO datetime for earliest suggested start"),
    end: z.string().describe("ISO datetime for latest suggested end"),
  }),
  agenda: z.array(
    z.object({
      time_offset_min: z.number().describe("Minutes from event start"),
      activity: z.string().describe("What happens at this time"),
      location_name: z.string().optional().describe("Specific spot/location name for this step"),
      lat: z.number().optional(),
      lng: z.number().optional(),
      travel_time_min: z.number().optional(),
    })
  ),
})

/** Full persisted itinerary (matches `Itinerary` in `lib/schemas.ts`) */
export const ItineraryFullZodSchema = ItineraryZodSchema.extend({
  id: z.string(),
  created_at: z.string(),
  video_context: VideoContextZodSchema.optional(),
})

/** POST /api/vote */
export const VoteRequestSchema = z.object({
  event_id: z.string().min(1),
  phone: z.string().min(3),
  vote: z.enum(["yes", "no"]),
})
