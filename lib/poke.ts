import type { Participant, Trip } from "@/lib/data/trips";

const POKE_API_URL = "https://poke.com/api/v1/inbound/api-message";

export class PokeApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown,
  ) {
    super(message);
    this.name = "PokeApiError";
  }
}

async function sendToParticipantPoke(
  participant: Participant,
  message: string,
): Promise<{ name: string; success: boolean; error?: string }> {
  const apiKey = process.env[participant.pokeEnvKey];
  if (!apiKey) {
    return {
      name: participant.name,
      success: false,
      error: `${participant.pokeEnvKey} is not configured`,
    };
  }

  try {
    const response = await fetch(POKE_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      return {
        name: participant.name,
        success: false,
        error: `Poke API returned ${response.status}: ${JSON.stringify(data)}`,
      };
    }

    return { name: participant.name, success: true };
  } catch (err) {
    return {
      name: participant.name,
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

function buildPersonalizedMessage(trip: Trip, participant: Participant): string {
  const otherParticipants = trip.participants
    .filter((p) => p.name !== participant.name)
    .map((p) => p.name)
    .join(" and ");

  return [
    `Hey ${participant.name}! A trip has been approved and we need to find a time that works for everyone.`,
    "",
    `Trip: "${trip.title}"`,
    `Destination: ${trip.destination}`,
    `Duration: ${trip.duration}`,
    "",
    "Itinerary:",
    trip.itinerary,
    "",
    `The other participants are: ${otherParticipants}.`,
    "",
    `Please check my Google Calendar and help me figure out when I'm free for ${trip.duration}. Once we agree on dates, use the PlanIt integration to submit my availability by calling submit_availability with trip_id "${trip.id}", participant_name "${participant.name}", and the dates I'm available in YYYY-MM-DD format.`,
    "",
    `You can also call get_current_availability with trip_id "${trip.id}" to see what the other participants have submitted so far and whether there's an overlapping time that works for everyone.`,
  ].join("\n");
}

export async function sendSchedulingToAllParticipants(trip: Trip) {
  const results = await Promise.all(
    trip.participants.map((p) =>
      sendToParticipantPoke(p, buildPersonalizedMessage(trip, p)),
    ),
  );

  const succeeded = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  return { results, succeeded: succeeded.length, failed: failed.length };
}
