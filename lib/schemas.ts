/**
 * Domain types for PlanIt (group planning + itineraries).
 * Runtime validation can be added later (e.g. zod) when wiring LLM/MCP flows.
 */

export type ActivityCategory =
  | "food"
  | "outdoors"
  | "nightlife"
  | "culture"
  | "sports"
  | "other"

export type PriceRange = "$" | "$$" | "$$$" | "$$$$"

/** What an LLM might return after analyzing a video */
export interface VideoContext {
  venue_type: string
  vibe: string
  activity_category: ActivityCategory
  location_hint?: string
  price_range: PriceRange
  duration_estimate_hrs: number
  key_details?: string
}

export interface AgendaItem {
  time_offset_min: number
  activity: string
  location_name?: string  // specific spot name for this step
  lat?: number
  lng?: number
  travel_time_min?: number  // travel time from the previous distinct stop (Routes API)
}

/** Real venue data from Google Maps Places API */
export interface PlaceDetails {
  place_id: string
  name: string
  formatted_address: string
  maps_url: string
  website?: string
  rating?: number
  user_rating_count?: number
  price_level?: number
  opening_hours?: {
    open_now?: boolean
    weekday_text?: string[]
  }
  photo_url?: string
  lat?: number
  lng?: number
}

/** Planning agent output */
export interface Itinerary {
  id: string
  title: string
  description: string
  venue_name: string
  venue_address: string
  venue_maps_url: string
  cost_per_person: string
  duration_hrs: number
  suggested_date_range: {
    start: string
    end: string
  }
  agenda: AgendaItem[]
  created_at: string
  video_context?: VideoContext
  place_details?: PlaceDetails
}

export interface Member {
  id: string
  name: string
  phone: string
  gcal_token?: string
  pokeEnvKey?: string
}

export interface Group {
  id: string
  name: string
  members: Member[]
}

export interface Vote {
  user_id: string
  phone: string
  vote: "yes" | "no"
  voted_at: string
}

export type EventStatus =
  | "pending"
  | "voting"
  | "quorum_reached"
  | "scheduled"
  | "confirmed"

export interface Event {
  id: string
  itinerary: Itinerary
  group: Group
  votes: Vote[]
  quorum_threshold: number
  status: EventStatus
  scheduled_time?: string
  gcal_event_ids?: string[]
  created_at: string
}

/** MCP-style tool inputs (for future use) */
export interface RecordVoteInput {
  event_id: string
  phone: string
  vote: "yes" | "no"
}

export interface ConfirmEventInput {
  event_id: string
  scheduled_time: string
}
