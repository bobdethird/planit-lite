import {
  getTrip,
  listSchedulableTrips,
  submitAvailability,
  getAvailability,
  confirmTripTime,
} from "@/lib/data/trips";

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface ToolResult {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: "get_trip_info",
    description:
      "Get detailed trip information including destination, duration, itinerary, and current status.",
    inputSchema: {
      type: "object",
      properties: {
        trip_id: {
          type: "string",
          description: "The unique identifier of the trip",
        },
      },
      required: ["trip_id"],
    },
  },
  {
    name: "get_participants",
    description:
      "Get the list of participants for a trip, including their names and phone numbers.",
    inputSchema: {
      type: "object",
      properties: {
        trip_id: {
          type: "string",
          description: "The unique identifier of the trip",
        },
      },
      required: ["trip_id"],
    },
  },
  {
    name: "submit_availability",
    description:
      "Submit or update a participant's available dates for a trip. Call this after checking the user's Google Calendar and confirming dates with them. Can be called multiple times to update availability.",
    inputSchema: {
      type: "object",
      properties: {
        trip_id: {
          type: "string",
          description: "The unique identifier of the trip",
        },
        participant_name: {
          type: "string",
          description:
            "The name of the participant submitting availability (e.g. 'Caden')",
        },
        available_dates: {
          type: "array",
          items: { type: "string" },
          description:
            "Array of dates the participant is available, in YYYY-MM-DD format (e.g. ['2026-06-10', '2026-06-11', '2026-06-12'])",
        },
      },
      required: ["trip_id", "participant_name", "available_dates"],
    },
  },
  {
    name: "get_current_availability",
    description:
      "See what dates each participant has submitted so far, which participants haven't responded yet, and any overlapping dates where everyone is free.",
    inputSchema: {
      type: "object",
      properties: {
        trip_id: {
          type: "string",
          description: "The unique identifier of the trip",
        },
      },
      required: ["trip_id"],
    },
  },
  {
    name: "confirm_trip_time",
    description:
      "Lock in the final confirmed date/time for the trip once all participants agree on a time. This marks the trip as scheduled.",
    inputSchema: {
      type: "object",
      properties: {
        trip_id: {
          type: "string",
          description: "The unique identifier of the trip",
        },
        scheduled_time: {
          type: "string",
          description:
            "The confirmed start date for the trip in YYYY-MM-DD format",
        },
      },
      required: ["trip_id", "scheduled_time"],
    },
  },
];

function errorResult(message: string): ToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify({ error: message }) }],
    isError: true,
  };
}

function successResult(data: unknown): ToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
  };
}

export function callTool(
  name: string,
  args: Record<string, unknown>,
): ToolResult {
  switch (name) {
    case "get_trip_info": {
      const tripId = args.trip_id as string;
      if (!tripId) return errorResult("trip_id is required");
      const trip = getTrip(tripId);
      if (!trip) return errorResult(`Trip '${tripId}' not found`);
      return successResult({
        id: trip.id,
        title: trip.title,
        destination: trip.destination,
        duration: trip.duration,
        itinerary: trip.itinerary,
        status: trip.status,
        scheduledTime: trip.scheduledTime ?? null,
        participantCount: trip.participants.length,
      });
    }

    case "get_participants": {
      const tripId = args.trip_id as string;
      if (!tripId) return errorResult("trip_id is required");
      const trip = getTrip(tripId);
      if (!trip) return errorResult(`Trip '${tripId}' not found`);
      return successResult(
        trip.participants.map((p) => ({
          name: p.name,
          phone: p.phone,
        })),
      );
    }

    case "submit_availability": {
      const tripId = args.trip_id as string;
      const participantName = args.participant_name as string;
      const availableDates = args.available_dates as string[];
      if (!tripId) return errorResult("trip_id is required");
      if (!participantName) return errorResult("participant_name is required");
      if (!availableDates || !Array.isArray(availableDates))
        return errorResult("available_dates must be an array of date strings");

      const result = submitAvailability(tripId, participantName, availableDates);
      if (!result) return errorResult(`Trip '${tripId}' not found`);

      return successResult({
        submitted: true,
        participant: participantName,
        datesCount: availableDates.length,
        overlapFound: result.overlap.length > 0,
        overlappingDates: result.overlap,
        message:
          result.overlap.length > 0
            ? `Overlap found! All participants are free on: ${result.overlap.join(", ")}`
            : "No full overlap yet. Waiting for other participants or updated dates.",
      });
    }

    case "get_current_availability": {
      const tripId = args.trip_id as string;
      if (!tripId) return errorResult("trip_id is required");
      const result = getAvailability(tripId);
      if (!result) return errorResult(`Trip '${tripId}' not found`);

      return successResult({
        entries: result.entries.map((e) => ({
          participant: e.participantName,
          availableDates: e.availableDates,
          submittedAt: e.submittedAt,
        })),
        missingParticipants: result.missingParticipants,
        overlappingDates: result.overlap,
        allResponded: result.missingParticipants.length === 0,
        overlapFound: result.overlap.length > 0,
      });
    }

    case "confirm_trip_time": {
      const tripId = args.trip_id as string;
      const scheduledTime = args.scheduled_time as string;
      if (!tripId) return errorResult("trip_id is required");
      if (!scheduledTime) return errorResult("scheduled_time is required");
      const updated = confirmTripTime(tripId, scheduledTime);
      if (!updated) return errorResult(`Trip '${tripId}' not found`);
      return successResult({
        confirmed: true,
        tripId: updated.id,
        title: updated.title,
        status: updated.status,
        scheduledTime: updated.scheduledTime,
      });
    }

    default:
      return errorResult(`Unknown tool: ${name}`);
  }
}
